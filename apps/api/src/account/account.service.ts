import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import argon2 from "argon2";
import { deleteAccountSchema } from "@programeint/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseBody } from "../common/parse";

@Injectable()
export class AccountService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async export(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        profile: true,
        goals: { include: { targets: true } },
        studyPreferences: true,
        nodeMastery: { include: { node: { select: { slug: true, title: true } } } },
        portfolioEvidence: { include: { project: { select: { slug: true, title: true } } } },
        githubAccount: { select: { login: true, connectedAt: true } },
        calendarEvents: {
          select: {
            kind: true,
            title: true,
            startsAt: true,
            endsAt: true,
            status: true,
            focusedMinutes: true,
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "account.export",
        entity: "user",
        entityId: userId,
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      policy:
        "Exportação dos dados pessoais e de aprendizagem associados a esta conta. Palavras-passe e tokens nunca são incluídos.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        locale: user.profile?.locale ?? "pt-BR",
      },
      goals: user.goals.map((goal) => ({
        statement: goal.statement,
        status: goal.status,
        targets: goal.targets.map((t) => ({ slug: t.slug, label: t.label, isPrimary: t.isPrimary })),
      })),
      preferences: user.studyPreferences
        ? {
            experienceLevel: user.studyPreferences.experienceLevel,
            weeklyHours: user.studyPreferences.weeklyHours,
            sessionMinutes: user.studyPreferences.sessionMinutes,
            prefersVideo: user.studyPreferences.prefersVideo,
            prefersReading: user.studyPreferences.prefersReading,
            prefersPractice: user.studyPreferences.prefersPractice,
            knownTopics: user.studyPreferences.knownTopics,
          }
        : null,
      mastery: user.nodeMastery.map((row) => ({
        nodeSlug: row.node.slug,
        nodeTitle: row.node.title,
        status: row.status,
        knowledgeScore: row.knowledgeScore,
        source: row.source,
      })),
      portfolio: user.portfolioEvidence.map((row) => ({
        projectSlug: row.project.slug,
        projectTitle: row.project.title,
        earnedAt: row.createdAt.toISOString(),
      })),
      github: user.githubAccount
        ? { login: user.githubAccount.login, connectedAt: user.githubAccount.connectedAt.toISOString() }
        : null,
      calendarEvents: user.calendarEvents.map((row) => ({
        ...row,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
      })),
    };
  }

  async remove(userId: string, raw: unknown) {
    const input = parseBody(deleteAccountSchema, raw);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.disabledAt) throw new ForbiddenException("Conta já desactivada.");

    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) throw new UnauthorizedException("Senha incorrecta.");

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "account.delete",
        entity: "user",
        entityId: userId,
        metadata: { email: user.email },
      },
    });

    // Cascade nas relações do User; audit fica com actor null (onDelete SetNull).
    await this.prisma.user.delete({ where: { id: userId } });

    return {
      ok: true,
      message: "Conta e dados associados foram apagados permanentemente.",
    };
  }
}
