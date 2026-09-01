import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GITHUB_BLOCKED, githubOauthReady } from "@programeint/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { decryptSecret, encryptSecret, generateToken } from "../auth/crypto";

const BLOCKED_MESSAGE =
  "GitHub OAuth não está configurado (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET). Sem credenciais reais não há ligação nem publicação de repositórios.";

const EVIDENCE_REPO = "programeint-portfolio";
const EVIDENCE_PATH = "EVIDENCIA.md";

@Injectable()
export class GithubService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  private clientId() {
    return this.config.get<string>("GITHUB_CLIENT_ID") ?? "";
  }

  private clientSecret() {
    return this.config.get<string>("GITHUB_CLIENT_SECRET") ?? "";
  }

  private sessionSecret() {
    return this.config.get<string>("SESSION_SECRET") ?? "";
  }

  private appUrl() {
    return (this.config.get<string>("APP_URL") ?? "http://localhost:3000").replace(/\/$/, "");
  }

  configured() {
    return githubOauthReady(this.clientId(), this.clientSecret());
  }

  async status(userId: string) {
    const account = await this.prisma.githubAccount.findUnique({ where: { userId } });
    if (!this.configured()) {
      return {
        configured: false,
        connected: false,
        login: null,
        canPublish: false,
        errorCode: GITHUB_BLOCKED,
        message: BLOCKED_MESSAGE,
      };
    }
    return {
      configured: true,
      connected: Boolean(account),
      login: account?.login ?? null,
      canPublish: Boolean(account),
      errorCode: null,
      message: account
        ? `Ligado como ${account.login}. Podes publicar a evidência do portfólio num repositório público.`
        : "Podes autorizar a conta GitHub (scope public_repo) para publicar evidência.",
    };
  }

  async connectUrl(userId: string) {
    if (!this.configured()) {
      throw new HttpException({ code: GITHUB_BLOCKED, message: BLOCKED_MESSAGE }, HttpStatus.CONFLICT);
    }
    const state = generateToken();
    await this.redis.setex(`gh:oauth:${state}`, userId, 600);
    const redirectUri = `${this.appUrl()}/api/github/callback`;
    const params = new URLSearchParams({
      client_id: this.clientId(),
      redirect_uri: redirectUri,
      scope: "read:user public_repo",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async callback(code: string | undefined, state: string | undefined) {
    if (!this.configured()) {
      throw new HttpException({ code: GITHUB_BLOCKED, message: BLOCKED_MESSAGE }, HttpStatus.CONFLICT);
    }
    if (!code || !state) {
      throw new UnauthorizedException("Callback GitHub sem code/state.");
    }
    const userId = await this.redis.get(`gh:oauth:${state}`);
    await this.redis.del(`gh:oauth:${state}`);
    if (!userId) {
      throw new UnauthorizedException("State OAuth inválido ou expirado.");
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.clientId(),
        client_secret: this.clientSecret(),
        code,
        redirect_uri: `${this.appUrl()}/api/github/callback`,
      }),
    });
    const tokenBody = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenBody.access_token) {
      throw new ConflictException("GitHub recusou o código OAuth. Não há conta ligada.");
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokenBody.access_token}`,
        "User-Agent": "programeint",
      },
    });
    const profile = (await userRes.json()) as { id?: number; login?: string };
    if (!profile.id || !profile.login) {
      throw new ConflictException("Não foi possível ler o perfil GitHub.");
    }

    const tokenCipher = encryptSecret(tokenBody.access_token, this.sessionSecret());
    await this.prisma.githubAccount.upsert({
      where: { userId },
      create: {
        userId,
        githubUserId: String(profile.id),
        login: profile.login,
        tokenCipher,
      },
      update: {
        githubUserId: String(profile.id),
        login: profile.login,
        tokenCipher,
      },
    });
    return `${this.appUrl()}/portfolio`;
  }

  async disconnect(userId: string) {
    await this.prisma.githubAccount.deleteMany({ where: { userId } });
    return this.status(userId);
  }

  private async tokenFor(userId: string) {
    const account = await this.prisma.githubAccount.findUnique({ where: { userId } });
    if (!account) {
      throw new ConflictException("Liga o GitHub antes de publicar evidência.");
    }
    return {
      account,
      token: decryptSecret(account.tokenCipher, this.sessionSecret()),
    };
  }

  private async gh(
    token: string,
    path: string,
    init?: RequestInit,
  ): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
    const response = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "programeint",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: response.ok, status: response.status, body };
  }

  async publishEvidence(userId: string) {
    if (!this.configured()) {
      throw new HttpException({ code: GITHUB_BLOCKED, message: BLOCKED_MESSAGE }, HttpStatus.CONFLICT);
    }

    const { account, token } = await this.tokenFor(userId);
    const evidence = await this.prisma.portfolioEvidence.findMany({
      where: { userId },
      include: { project: true },
      orderBy: { createdAt: "asc" },
    });
    if (evidence.length === 0) {
      throw new ConflictException(
        "Não há evidência de portfólio para publicar. Passa os testes de um projeto primeiro.",
      );
    }

    const markdown = [
      `# Evidência Programeint — ${account.login}`,
      "",
      `Gerado em ${new Date().toISOString()}.`,
      "",
      "Isto **não é um certificado**. São provas de testes isolados que passaram na plataforma.",
      "",
      ...evidence.flatMap((row) => [
        `## ${row.project.title}`,
        "",
        `- Projecto: \`${row.project.slug}\``,
        `- Evidência em: ${row.createdAt.toISOString()}`,
        "",
      ]),
    ].join("\n");

    const repoGet = await this.gh(token, `/repos/${account.login}/${EVIDENCE_REPO}`);
    if (repoGet.status === 404) {
      const created = await this.gh(token, "/user/repos", {
        method: "POST",
        body: JSON.stringify({
          name: EVIDENCE_REPO,
          description: "Evidência de aprendizagem Programeint (não é certificado)",
          private: false,
          auto_init: true,
        }),
      });
      if (!created.ok) {
        throw new ConflictException(
          `Não foi possível criar o repositório: ${String(created.body.message ?? created.status)}`,
        );
      }
    } else if (!repoGet.ok) {
      throw new ConflictException(
        `GitHub recusou ler o repositório: ${String(repoGet.body.message ?? repoGet.status)}`,
      );
    }

    const existing = await this.gh(
      token,
      `/repos/${account.login}/${EVIDENCE_REPO}/contents/${EVIDENCE_PATH}`,
    );
    const sha = typeof existing.body.sha === "string" ? existing.body.sha : undefined;
    const put = await this.gh(token, `/repos/${account.login}/${EVIDENCE_REPO}/contents/${EVIDENCE_PATH}`, {
      method: "PUT",
      body: JSON.stringify({
        message: `chore: actualizar evidência Programeint (${evidence.length} projecto(s))`,
        content: Buffer.from(markdown, "utf8").toString("base64"),
        ...(sha ? { sha } : {}),
      }),
    });
    if (!put.ok) {
      throw new ConflictException(
        `Não foi possível publicar o ficheiro: ${String(put.body.message ?? put.status)}`,
      );
    }

    const htmlUrl =
      typeof (put.body.content as { html_url?: string } | undefined)?.html_url === "string"
        ? (put.body.content as { html_url: string }).html_url
        : `https://github.com/${account.login}/${EVIDENCE_REPO}/blob/main/${EVIDENCE_PATH}`;

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "github.publish_evidence",
        entity: "portfolio_evidence",
        metadata: { repo: EVIDENCE_REPO, count: evidence.length, url: htmlUrl },
      },
    });

    return {
      ok: true,
      repo: `${account.login}/${EVIDENCE_REPO}`,
      path: EVIDENCE_PATH,
      url: htmlUrl,
      count: evidence.length,
      message: `Evidência publicada em ${account.login}/${EVIDENCE_REPO}. Continua a não ser um certificado.`,
    };
  }
}
