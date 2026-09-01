import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { projectSaveSchema, sanitizeLabFiles } from "@programeint/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseBody } from "../common/parse";
import { runJavaSandbox } from "../lab/sandbox";

type StarterFile = { path: string; content: string };

const READY = new Set(["studied", "passed"]);

@Injectable()
export class ProjectService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const [projects, mastery, evidence] = await Promise.all([
      this.prisma.portfolioProject.findMany({
        where: { published: true },
        include: { requirements: { include: { node: true } } },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.nodeMastery.findMany({ where: { userId } }),
      this.prisma.portfolioEvidence.findMany({
        where: { userId },
        include: { project: true, run: true },
      }),
    ]);
    const masteryByNode = new Map(mastery.map((row) => [row.nodeId, row.status]));
    const evidenceByProject = new Map(evidence.map((row) => [row.projectId, row]));

    return {
      items: projects.map((project) => {
        const missing = project.requirements
          .filter((req) => !READY.has(masteryByNode.get(req.nodeId) ?? ""))
          .map((req) => ({ slug: req.node.slug, title: req.node.title }));
        const ev = evidenceByProject.get(project.id);
        return {
          slug: project.slug,
          title: project.title,
          locked: missing.length > 0,
          missing,
          passed: Boolean(ev),
          passedAt: ev?.createdAt ?? null,
          href: `/projeto/${project.slug}`,
        };
      }),
    };
  }

  async portfolio(userId: string) {
    const rows = await this.prisma.portfolioEvidence.findMany({
      where: { userId },
      include: { project: true, run: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      items: rows.map((row) => ({
        projectSlug: row.project.slug,
        title: row.project.title,
        passedAt: row.createdAt,
        runId: row.runId,
        href: `/projeto/${row.project.slug}`,
        summary:
          "Testes isolados passaram nesta JVM Docker. Isto é evidência de aplicação, não um certificado nem um projeto de produção.",
      })),
    };
  }

  async get(userId: string, slug: string) {
    const project = await this.requireProject(slug);
    const access = await this.access(userId, project);
    let workspace = await this.prisma.projectWorkspace.findUnique({
      where: { userId_projectId: { userId, projectId: project.id } },
      include: { files: true },
    });
    if (!workspace) {
      const starters = project.starterFiles as StarterFile[];
      workspace = await this.prisma.projectWorkspace.create({
        data: {
          userId,
          projectId: project.id,
          files: { create: starters.map((file) => ({ path: file.path, content: file.content })) },
        },
        include: { files: true },
      });
    }
    const latest = await this.prisma.projectRun.findFirst({
      where: { userId, projectId: project.id },
      orderBy: { startedAt: "desc" },
    });
    return this.present(project, workspace, latest, access);
  }

  async save(userId: string, slug: string, raw: unknown) {
    await this.requireDiagnosis(userId);
    const project = await this.requireProject(slug);
    const access = await this.access(userId, project);
    if (access.locked) {
      throw new BadRequestException(
        `Falta evidência em: ${access.missing.map((item) => item.title).join(", ")}.`,
      );
    }
    const input = parseBody(projectSaveSchema, raw);
    const hidden = new Set((project.hiddenFiles as StarterFile[]).map((file) => file.path));
    let files: StarterFile[];
    try {
      files = sanitizeLabFiles(input.files).filter((file) => !hidden.has(file.path));
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : "Ficheiros inválidos.");
    }
    if (files.length === 0) {
      throw new BadRequestException("Grava pelo menos um ficheiro visível.");
    }

    const workspace = await this.prisma.projectWorkspace.upsert({
      where: { userId_projectId: { userId, projectId: project.id } },
      create: {
        userId,
        projectId: project.id,
        files: { create: files.map((file) => ({ path: file.path, content: file.content })) },
      },
      update: {},
    });
    await this.prisma.projectFile.deleteMany({ where: { workspaceId: workspace.id } });
    await this.prisma.projectFile.createMany({
      data: files.map((file) => ({
        workspaceId: workspace.id,
        path: file.path,
        content: file.content,
      })),
    });
    const full = await this.prisma.projectWorkspace.findUniqueOrThrow({
      where: { id: workspace.id },
      include: { files: true },
    });
    const latest = await this.prisma.projectRun.findFirst({
      where: { userId, projectId: project.id },
      orderBy: { startedAt: "desc" },
    });
    return this.present(project, full, latest, access);
  }

  async run(userId: string, slug: string) {
    await this.requireDiagnosis(userId);
    const project = await this.requireProject(slug);
    const access = await this.access(userId, project);
    if (access.locked) {
      throw new BadRequestException(
        `Falta evidência em: ${access.missing.map((item) => item.title).join(", ")}.`,
      );
    }
    const workspace = await this.prisma.projectWorkspace.findUnique({
      where: { userId_projectId: { userId, projectId: project.id } },
      include: { files: true },
    });
    if (!workspace || workspace.files.length === 0) {
      throw new BadRequestException("Grava o código antes de executar.");
    }

    const hidden = project.hiddenFiles as StarterFile[];
    const merged = new Map<string, string>();
    for (const file of workspace.files) merged.set(file.path, file.content);
    for (const file of hidden) merged.set(file.path, file.content);

    const created = await this.prisma.projectRun.create({
      data: {
        userId,
        projectId: project.id,
        workspaceId: workspace.id,
        status: "running",
      },
    });

    const result = await runJavaSandbox({
      files: [...merged.entries()].map(([path, content]) => ({ path, content })),
      entryClass: project.entryClass,
      timeoutMs: project.timeoutMs,
    });

    const updated = await this.prisma.projectRun.update({
      where: { id: created.id },
      data: {
        status: result.status,
        passed: result.passed,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        errorCode: result.errorCode,
        finishedAt: new Date(),
      },
    });

    if (result.passed) {
      await this.prisma.portfolioEvidence.upsert({
        where: { userId_projectId: { userId, projectId: project.id } },
        create: { userId, projectId: project.id, runId: updated.id },
        update: { runId: updated.id },
      });
    }

    const full = await this.prisma.projectWorkspace.findUniqueOrThrow({
      where: { id: workspace.id },
      include: { files: true },
    });
    const refreshed = await this.access(userId, project);
    return this.present(project, full, updated, refreshed);
  }

  private present(
    project: {
      slug: string;
      title: string;
      brief: string;
      language: string;
      timeoutMs: number;
    },
    workspace: { files: Array<{ path: string; content: string }> },
    run: {
      id: string;
      status: string;
      passed: boolean | null;
      exitCode: number | null;
      stdout: string;
      stderr: string;
      errorCode: string | null;
      startedAt: Date;
      finishedAt: Date | null;
    } | null,
    access: {
      locked: boolean;
      missing: Array<{ slug: string; title: string }>;
      passed: boolean;
      passedAt: Date | null;
    },
  ) {
    return {
      project: {
        slug: project.slug,
        title: project.title,
        brief: project.brief,
        language: project.language,
        timeoutMs: project.timeoutMs,
      },
      locked: access.locked,
      missing: access.missing,
      passed: access.passed,
      passedAt: access.passedAt,
      files: workspace.files.map((file) => ({ path: file.path, content: file.content })),
      lastRun: run
        ? {
            id: run.id,
            status: run.status,
            passed: run.passed,
            exitCode: run.exitCode,
            stdout: run.stdout,
            stderr: run.stderr,
            errorCode: run.errorCode,
            startedAt: run.startedAt,
            finishedAt: run.finishedAt,
          }
        : null,
    };
  }

  private async requireDiagnosis(userId: string) {
    const done = await this.prisma.diagnosisSession.findFirst({
      where: { userId, status: "completed" },
    });
    if (!done) {
      throw new BadRequestException("Faz o diagnóstico antes do projeto.");
    }
  }

  private async requireProject(slug: string) {
    const project = await this.prisma.portfolioProject.findUnique({
      where: { slug },
      include: { requirements: { include: { node: true } } },
    });
    if (!project || !project.published) {
      throw new NotFoundException("Projeto não publicado.");
    }
    return project;
  }

  private async access(
    userId: string,
    project: {
      id: string;
      requirements: Array<{ nodeId: string; node: { slug: string; title: string } }>;
    },
  ) {
    const [mastery, evidence] = await Promise.all([
      this.prisma.nodeMastery.findMany({
        where: { userId, nodeId: { in: project.requirements.map((item) => item.nodeId) } },
      }),
      this.prisma.portfolioEvidence.findUnique({
        where: { userId_projectId: { userId, projectId: project.id } },
      }),
    ]);
    const masteryByNode = new Map(mastery.map((row) => [row.nodeId, row.status]));
    const missing = project.requirements
      .filter((req) => !READY.has(masteryByNode.get(req.nodeId) ?? ""))
      .map((req) => ({ slug: req.node.slug, title: req.node.title }));
    return {
      locked: missing.length > 0,
      missing,
      passed: Boolean(evidence),
      passedAt: evidence?.createdAt ?? null,
    };
  }
}
