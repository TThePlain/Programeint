import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Inject,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import argon2 from "argon2";
import type { Request, Response } from "express";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "@programeint/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { MailService } from "../mail/mail.service";
import { addHours, addMinutes, generateToken, hashToken } from "./crypto";

const GENERIC_LOGIN = "E-mail ou senha incorretos.";
const GENERIC_FORGOT =
  "Se existir uma conta com este e-mail, enviaremos instruções para redefinir a senha.";

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(MailService) private readonly mail: MailService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  cookieName() {
    return this.config.get<string>("SESSION_COOKIE_NAME") ?? "programeint_sid";
  }

  private idleMinutes() {
    return Number(this.config.get("SESSION_IDLE_MINUTES") ?? 30);
  }

  private absoluteHours() {
    return Number(this.config.get("SESSION_ABSOLUTE_HOURS") ?? 168);
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: this.config.get("NODE_ENV") === "production",
      path: "/",
      maxAge: this.absoluteHours() * 60 * 60 * 1000,
    };
  }

  async register(raw: unknown, req: Request) {
    const input = parse(registerSchema, raw);
    await this.redis.consumeToken(`rl:register:${req.ip ?? "ip"}`, 20, 60);

    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException("Já existe uma conta com este e-mail.");
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const token = generateToken();

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          profile: { create: { locale: "pt-BR" } },
        },
      });
      await tx.emailVerificationToken.create({
        data: {
          userId: created.id,
          tokenHash: hashToken(token),
          expiresAt: addHours(new Date(), 24),
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: created.id,
          action: "auth.register",
          entity: "user",
          entityId: created.id,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      });
      return created;
    });

    await this.mail.sendVerification(user.email, user.name, token);

    return {
      user: publicUser(user),
      message: "Conta criada. Confirma o e-mail para entrares.",
    };
  }

  async login(raw: unknown, req: Request, res: Response) {
    const input = parse(loginSchema, raw);
    await this.redis.consumeToken(`rl:login:${req.ip ?? "ip"}:${input.email}`, 10, 60);

    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || user.disabledAt) {
      throw new UnauthorizedException(GENERIC_LOGIN);
    }

    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) {
      throw new UnauthorizedException(GENERIC_LOGIN);
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException({
        code: "EMAIL_NOT_VERIFIED",
        message: "Confirma o teu e-mail antes de entrares.",
      });
    }

    const token = await this.createSession(user.id, req);
    res.cookie(this.cookieName(), token, this.cookieOptions());

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "auth.login",
        entity: "session",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });

    return { user: publicUser(user) };
  }

  async logout(req: Request, res: Response) {
    const token = this.readCookie(req);
    if (token) {
      await this.prisma.session.updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie(this.cookieName(), { path: "/" });
    return { ok: true };
  }

  async session(req: Request, res: Response) {
    const user = await this.requireUser(req, res, false);
    if (!user) {
      return { user: null };
    }
    return { user: publicUser(user) };
  }

  async verifyEmail(raw: unknown) {
    const input = parse(verifyEmailSchema, raw);
    const tokenHash = hashToken(input.token);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException("Link de verificação inválido ou expirado.");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: record.userId,
          action: "auth.verify_email",
          entity: "user",
          entityId: record.userId,
        },
      }),
    ]);

    return { ok: true, message: "E-mail confirmado. Já podes entrar." };
  }

  async resendVerification(raw: unknown, req: Request) {
    const input = parse(resendVerificationSchema, raw);
    await this.redis.consumeToken(`rl:resend:${req.ip ?? "ip"}:${input.email}`, 3, 60);

    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (user && !user.emailVerifiedAt) {
      const token = generateToken();
      await this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: addHours(new Date(), 24),
        },
      });
      await this.mail.sendVerification(user.email, user.name, token);
    }

    return {
      message: "Se a conta existir e ainda não estiver confirmada, enviámos um novo e-mail.",
    };
  }

  async forgotPassword(raw: unknown, req: Request) {
    const input = parse(forgotPasswordSchema, raw);
    await this.redis.consumeToken(`rl:forgot:${req.ip ?? "ip"}`, 5, 60);

    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (user && !user.disabledAt) {
      const token = generateToken();
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: addHours(new Date(), 1),
        },
      });
      await this.mail.sendPasswordReset(user.email, user.name, token);
    }

    return { message: GENERIC_FORGOT };
  }

  async resetPassword(raw: unknown) {
    const input = parse(resetPasswordSchema, raw);
    const tokenHash = hashToken(input.token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException("Link de recuperação inválido ou expirado.");
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: record.userId,
          action: "auth.reset_password",
          entity: "user",
          entityId: record.userId,
        },
      }),
    ]);

    return { ok: true, message: "Senha atualizada. Entra com a nova senha." };
  }

  async requireUser(req: Request, res: Response, throwIfMissing = true) {
    const token = this.readCookie(req);
    if (!token) {
      if (throwIfMissing) throw new UnauthorizedException("Sessão necessária.");
      return null;
    }

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    const now = new Date();
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < now ||
      session.absoluteExpiresAt < now ||
      session.user.disabledAt
    ) {
      res.clearCookie(this.cookieName(), { path: "/" });
      if (throwIfMissing) throw new UnauthorizedException("Sessão expirada.");
      return null;
    }

    const nextExpiry = addMinutes(now, this.idleMinutes());
    const capped = nextExpiry < session.absoluteExpiresAt ? nextExpiry : session.absoluteExpiresAt;
    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: now, expiresAt: capped },
    });

    return session.user;
  }

  private async createSession(userId: string, req: Request) {
    const token = generateToken();
    const now = new Date();
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        lastSeenAt: now,
        expiresAt: addMinutes(now, this.idleMinutes()),
        absoluteExpiresAt: addHours(now, this.absoluteHours()),
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });
    return token;
  }

  private readCookie(req: Request) {
    const name = this.cookieName();
    const value = req.cookies?.[name];
    return typeof value === "string" && value.length > 0 ? value : null;
  }
}

function parse<T>(schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } } } }, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = Object.values(result.error.flatten().fieldErrors).flat()[0];
    throw new BadRequestException(first ?? "Dados inválidos.");
  }
  return result.data;
}

function publicUser(user: { id: string; email: string; name: string; emailVerifiedAt: Date | null }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}
