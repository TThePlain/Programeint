import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  evaluateGuidedEvidence,
  labSaveSchema,
  sanitizeLabFiles,
} from "@programeint/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseBody } from "../common/parse";
import { resolveCurriculumContext, assertNodeInUserScope } from "../curriculum/curriculum-context";
import { probeLabSandbox, runJavaSandbox } from "./sandbox";

type StarterFile = { path: string; content: string };

@Injectable()
export class LabService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  status() {
    return probeLabSandbox();
  }

  async getExercise(userId: string, slug: string) {
    await this.requireDiagnosis(userId);
    const exercise = await this.prisma.labExercise.findUnique({
      where: { slug },
      include: { node: true },
    });
    if (!exercise || !exercise.published) {
      throw new NotFoundException("Exercício de lab não publicado.");
    }
    await assertNodeInUserScope(this.prisma, userId, exercise.nodeId);

    let workspace = await this.prisma.labWorkspace.findUnique({
      where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
      include: { files: true },
    });
    if (!workspace) {
      const starters = exercise.starterFiles as StarterFile[];
      workspace = await this.prisma.labWorkspace.create({
        data: {
          userId,
          exerciseId: exercise.id,
          files: { create: starters.map((file) => ({ path: file.path, content: file.content })) },
        },
        include: { files: true },
      });
    }

    const latest = await this.prisma.labRun.findFirst({
      where: { userId, exerciseId: exercise.id },
      orderBy: { startedAt: "desc" },
    });

    return this.present(exercise, workspace, latest);
  }

  async save(userId: string, slug: string, raw: unknown) {
    await this.requireDiagnosis(userId);
    const exercise = await this.requireExercise(userId, slug);
    const input = parseBody(labSaveSchema, raw);
    const hidden = new Set((exercise.hiddenFiles as StarterFile[]).map((file) => file.path));
    const mode = exercise.language === "guided" ? "guided" : "java";
    let files: StarterFile[];
    try {
      files = sanitizeLabFiles(input.files, mode).filter((file) => !hidden.has(file.path));
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : "Ficheiros inválidos.");
    }
    if (files.length === 0) {
      throw new BadRequestException("Grava pelo menos um ficheiro visível.");
    }

    const workspace = await this.prisma.labWorkspace.upsert({
      where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
      create: {
        userId,
        exerciseId: exercise.id,
        files: { create: files.map((file) => ({ path: file.path, content: file.content })) },
      },
      update: {},
    });
    await this.prisma.labFile.deleteMany({ where: { workspaceId: workspace.id } });
    await this.prisma.labFile.createMany({
      data: files.map((file) => ({
        workspaceId: workspace.id,
        path: file.path,
        content: file.content,
      })),
    });
    const full = await this.prisma.labWorkspace.findUniqueOrThrow({
      where: { id: workspace.id },
      include: { files: true },
    });
    const latest = await this.prisma.labRun.findFirst({
      where: { userId, exerciseId: exercise.id },
      orderBy: { startedAt: "desc" },
    });
    return this.present(exercise, full, latest);
  }

  async run(userId: string, slug: string) {
    await this.requireDiagnosis(userId);
    const exercise = await this.requireExercise(userId, slug);
    const workspace = await this.prisma.labWorkspace.findUnique({
      where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
      include: { files: true },
    });
    if (!workspace || workspace.files.length === 0) {
      throw new BadRequestException("Grava o trabalho antes de submeter.");
    }

    if (exercise.language === "guided") {
      return this.runGuided(userId, exercise, workspace);
    }

    const hidden = exercise.hiddenFiles as StarterFile[];
    const merged = new Map<string, string>();
    for (const file of workspace.files) merged.set(file.path, file.content);
    for (const file of hidden) merged.set(file.path, file.content);

    const created = await this.prisma.labRun.create({
      data: {
        userId,
        exerciseId: exercise.id,
        workspaceId: workspace.id,
        status: "running",
      },
    });

    const result = await runJavaSandbox({
      files: [...merged.entries()].map(([path, content]) => ({ path, content })),
      entryClass: exercise.entryClass,
      timeoutMs: exercise.timeoutMs,
    });

    const updated = await this.prisma.labRun.update({
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
      await this.applyLabMastery(userId, exercise.nodeId);
    }

    const full = await this.prisma.labWorkspace.findUniqueOrThrow({
      where: { id: workspace.id },
      include: { files: true },
    });
    return this.present(exercise, full, updated);
  }

  private async runGuided(
    userId: string,
    exercise: {
      id: string;
      nodeId: string;
      slug: string;
      title: string;
      prompt: string;
      language: string;
      timeoutMs: number;
      entryClass: string;
      node: { slug: string; title: string };
    },
    workspace: { id: string; files: Array<{ path: string; content: string }> },
  ) {
    const main =
      workspace.files.find(
        (f) => f.path === "practice.md" || f.path === "project.md" || f.path === "problema.md",
      ) ?? workspace.files[0];
    const kind = /project/i.test(exercise.slug) || main?.path === "project.md" ? "project" : "practice";
    const verdict = evaluateGuidedEvidence(main?.content ?? "", kind);

    const updated = await this.prisma.labRun.create({
      data: {
        userId,
        exerciseId: exercise.id,
        workspaceId: workspace.id,
        status: verdict.passed ? "succeeded" : "failed",
        passed: verdict.passed,
        exitCode: verdict.passed ? 0 : 1,
        stdout: verdict.stdout,
        stderr: verdict.passed ? "" : verdict.stdout,
        errorCode: null,
        finishedAt: new Date(),
      },
    });

    if (verdict.passed) {
      await this.applyLabMastery(userId, exercise.nodeId);
    }

    const full = await this.prisma.labWorkspace.findUniqueOrThrow({
      where: { id: workspace.id },
      include: { files: true },
    });
    return this.present(exercise, full, updated);
  }

  private present(
    exercise: {
      slug: string;
      title: string;
      prompt: string;
      language: string;
      timeoutMs: number;
      node: { slug: string; title: string };
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
  ) {
    return {
      exercise: {
        slug: exercise.slug,
        title: exercise.title,
        prompt: exercise.prompt,
        language: exercise.language,
        timeoutMs: exercise.timeoutMs,
        node: { slug: exercise.node.slug, title: exercise.node.title },
      },
      files: workspace.files.map((file) => ({ path: file.path, content: file.content })),
      hiddenFiles: undefined,
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

  private async requireDiagnosis(_userId: string) {
    // Prática guiada e labs não dependem do diagnóstico — o mapa do objectivo basta.
  }

  async listForGoal(userId: string) {
    const ctx = await resolveCurriculumContext(this.prisma, userId);
    if (!ctx.available) {
      return { available: false as const, message: ctx.message, exercises: [] as const };
    }
    const nodeScope =
      ctx.scopeGoalId === null ? { goalId: null as null } : { goalId: ctx.scopeGoalId };
    const exercises = await this.prisma.labExercise.findMany({
      where: { published: true, node: nodeScope },
      include: { node: { select: { slug: true, title: true, sortOrder: true, summary: true } } },
      orderBy: { node: { sortOrder: "asc" } },
    });
    const runs = await this.prisma.labRun.findMany({
      where: {
        userId,
        passed: true,
        exerciseId: { in: exercises.map((e) => e.id) },
      },
      select: { exerciseId: true },
    });
    const passedIds = new Set(runs.map((r) => r.exerciseId));
    const primary = ctx.goal.targets.find((t) => t.isPrimary) ?? ctx.goal.targets[0] ?? null;
    return {
      available: true as const,
      goal: {
        statement: ctx.goal.statement,
        primaryTarget: primary ? { slug: primary.slug, label: primary.label } : null,
      },
      exercises: exercises.map((ex) => ({
        slug: ex.slug,
        title: ex.title,
        prompt: ex.prompt,
        language: ex.language,
        passed: passedIds.has(ex.id),
        node: {
          slug: ex.node.slug,
          title: ex.node.title,
          summary: ex.node.summary,
          sortOrder: ex.node.sortOrder,
        },
      })),
    };
  }

  private async requireExercise(userId: string, slug: string) {
    const exercise = await this.prisma.labExercise.findUnique({
      where: { slug },
      include: { node: true },
    });
    if (!exercise || !exercise.published) {
      throw new NotFoundException("Exercício de lab não publicado.");
    }
    await assertNodeInUserScope(this.prisma, userId, exercise.nodeId);
    return exercise;
  }

  private async applyLabMastery(userId: string, nodeId: string) {
    const existing = await this.prisma.nodeMastery.findUnique({
      where: { userId_nodeId: { userId, nodeId } },
    });
    const keepPassed = existing?.status === "passed" && existing.source === "diagnosis";
    await this.prisma.nodeMastery.upsert({
      where: { userId_nodeId: { userId, nodeId } },
      create: {
        userId,
        nodeId,
        status: "passed",
        knowledgeScore: 0.7,
        source: "lab",
      },
      update:
        keepPassed && existing
          ? { knowledgeScore: Math.max(existing.knowledgeScore, 0.7) }
          : { status: "passed", knowledgeScore: 0.7, source: "lab" },
    });
  }
}
