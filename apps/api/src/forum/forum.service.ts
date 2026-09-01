import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  FORUM_POST_KINDS,
  createForumCommentSchema,
  createForumPostSchema,
  createForumSolutionSchema,
  extractJavaClassName,
  runForumChallengeSchema,
  type ForumPostKind,
} from "@programeint/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseBody } from "../common/parse";
import { runJavaSandbox } from "../lab/sandbox";

const authorSelect = { id: true, name: true } as const;

@Injectable()
export class ForumService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(kind?: string) {
    const filter =
      kind && (FORUM_POST_KINDS as readonly string[]).includes(kind)
        ? { kind }
        : undefined;

    const posts = await this.prisma.forumPost.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        author: { select: authorSelect },
        _count: { select: { comments: true, solutions: true } },
      },
    });

    return {
      posts: posts.map((p) => ({
        id: p.id,
        kind: p.kind as ForumPostKind,
        title: p.title,
        bodyPreview: p.body.slice(0, 240),
        language: p.language,
        hasChecks: Boolean(p.checkCode?.trim()),
        createdAt: p.createdAt.toISOString(),
        author: p.author,
        commentCount: p._count.comments,
        solutionCount: p._count.solutions,
      })),
    };
  }

  async get(id: string) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id },
      include: {
        author: { select: authorSelect },
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: authorSelect },
            replies: {
              orderBy: { createdAt: "asc" },
              include: { author: { select: authorSelect } },
            },
          },
        },
        solutions: {
          orderBy: { createdAt: "desc" },
          take: 40,
          include: { author: { select: authorSelect } },
        },
      },
    });

    if (!post) throw new NotFoundException("Publicação não encontrada.");

    return {
      post: {
        id: post.id,
        kind: post.kind as ForumPostKind,
        title: post.title,
        body: post.body,
        acceptanceCriteria: post.acceptanceCriteria,
        language: post.language,
        starterCode: post.starterCode,
        hasChecks: Boolean(post.checkCode?.trim()),
        entryClass: post.entryClass ?? "Check",
        timeoutMs: post.timeoutMs,
        createdAt: post.createdAt.toISOString(),
        author: post.author,
        comments: post.comments.map((c) => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt.toISOString(),
          author: c.author,
          replies: c.replies.map((r) => ({
            id: r.id,
            body: r.body,
            createdAt: r.createdAt.toISOString(),
            author: r.author,
          })),
        })),
        solutions: post.solutions.map((s) => ({
          id: s.id,
          code: s.code,
          note: s.note,
          status: s.status,
          passed: s.passed,
          exitCode: s.exitCode,
          stdout: s.stdout,
          stderr: s.stderr,
          errorCode: s.errorCode,
          createdAt: s.createdAt.toISOString(),
          author: s.author,
        })),
      },
    };
  }

  async create(userId: string, raw: unknown) {
    const input = parseBody(createForumPostSchema, raw);

    const post = await this.prisma.forumPost.create({
      data: {
        authorId: userId,
        kind: input.kind,
        title: input.title,
        body: input.body,
        acceptanceCriteria: input.acceptanceCriteria?.trim() || null,
        language: input.language?.trim() || (input.kind === "challenge" ? "java" : null),
        starterCode: input.starterCode?.trim() || null,
        checkCode: input.checkCode?.trim() || null,
        entryClass: input.entryClass?.trim() || "Check",
        timeoutMs: input.timeoutMs ?? 20_000,
      },
      include: { author: { select: authorSelect } },
    });

    return {
      post: {
        id: post.id,
        kind: post.kind as ForumPostKind,
        title: post.title,
        createdAt: post.createdAt.toISOString(),
        author: post.author,
      },
    };
  }

  async addComment(userId: string, postId: string, raw: unknown) {
    const input = parseBody(createForumCommentSchema, raw);
    const post = await this.prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("Publicação não encontrada.");

    if (input.parentId) {
      const parent = await this.prisma.forumComment.findFirst({
        where: { id: input.parentId, postId },
      });
      if (!parent) throw new BadRequestException("Comentário pai inválido.");
      if (parent.parentId) {
        throw new BadRequestException("Só é possível responder a comentários de primeiro nível.");
      }
    }

    const comment = await this.prisma.forumComment.create({
      data: {
        postId,
        authorId: userId,
        body: input.body,
        parentId: input.parentId ?? null,
      },
      include: { author: { select: authorSelect } },
    });

    return {
      comment: {
        id: comment.id,
        body: comment.body,
        parentId: comment.parentId,
        createdAt: comment.createdAt.toISOString(),
        author: comment.author,
      },
    };
  }

  async runChallenge(userId: string, postId: string, raw: unknown) {
    void userId;
    const input = parseBody(runForumChallengeSchema, raw);
    const post = await this.prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("Publicação não encontrada.");
    if (post.kind !== "challenge" && post.kind !== "help") {
      throw new BadRequestException("Só desafios e pedidos de ajuda têm execução.");
    }

    const run = await this.execute(post, input.code);
    return { run };
  }

  async addSolution(userId: string, postId: string, raw: unknown) {
    const input = parseBody(createForumSolutionSchema, raw);
    const post = await this.prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("Publicação não encontrada.");
    if (post.kind !== "challenge" && post.kind !== "help") {
      throw new BadRequestException("Soluções só para desafios ou pedidos de ajuda.");
    }

    const run =
      post.kind === "challenge" || post.checkCode?.trim()
        ? await this.execute(post, input.code)
        : {
            status: "succeeded" as const,
            passed: true,
            exitCode: 0,
            stdout: "Solução publicada (sem testes automatizados).",
            stderr: "",
            errorCode: null as string | null,
          };

    const solution = await this.prisma.forumSolution.create({
      data: {
        postId,
        authorId: userId,
        code: input.code,
        note: input.note?.trim() || null,
        status: run.status,
        passed: run.passed,
        exitCode: run.exitCode,
        stdout: run.stdout,
        stderr: run.stderr,
        errorCode: run.errorCode,
      },
      include: { author: { select: authorSelect } },
    });

    return {
      solution: {
        id: solution.id,
        code: solution.code,
        note: solution.note,
        status: solution.status,
        passed: solution.passed,
        exitCode: solution.exitCode,
        stdout: solution.stdout,
        stderr: solution.stderr,
        errorCode: solution.errorCode,
        createdAt: solution.createdAt.toISOString(),
        author: solution.author,
      },
      run,
    };
  }

  private async execute(
    post: {
      starterCode: string | null;
      checkCode: string | null;
      entryClass: string | null;
      timeoutMs: number;
      language: string | null;
    },
    userCode: string,
  ) {
    const code = userCode.replace(/\r\n/g, "\n");
    if (code.includes("\0")) {
      throw new BadRequestException("Código binário recusado.");
    }

    const solutionClass = extractJavaClassName(code, "Solution");
    const files: Array<{ path: string; content: string }> = [
      { path: `${solutionClass}.java`, content: code },
    ];

    const check = post.checkCode?.trim();
    if (check) {
      const checkClass = extractJavaClassName(check, post.entryClass ?? "Check");
      if (checkClass === solutionClass) {
        throw new BadRequestException(
          "A classe da solução não pode chamar-se igual à dos testes (Check).",
        );
      }
      files.push({ path: `${checkClass}.java`, content: check });
    }

    const entryClass = check
      ? extractJavaClassName(check, post.entryClass ?? "Check")
      : extractJavaClassName(code, post.entryClass ?? solutionClass);

    return runJavaSandbox({
      files,
      entryClass,
      timeoutMs: post.timeoutMs || 20_000,
    });
  }
}
