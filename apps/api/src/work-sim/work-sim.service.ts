import {
  BadRequestException,
  Inject,
  Injectable,
} from "@nestjs/common";
import {
  WORK_SIM_KINDS,
  buildWorkSimRituals,
  evaluateWorkSimSubmit,
  presentDevCareer,
  workSimCareerForGoal,
  workSimSubmitSchema,
  type WorkSimKind,
} from "@programeint/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseBody } from "../common/parse";
import { resolveCurriculumContext } from "../curriculum/curriculum-context";
import { scopePrefixForGoal } from "../curriculum/curriculum-plan";

@Injectable()
export class WorkSimService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async status(userId: string) {
    const ctx = await resolveCurriculumContext(this.prisma, userId);
    if (!ctx.available) {
      return {
        available: false,
        message: ctx.message ?? "Define um objectivo para o simulador de trabalho.",
        generating: Boolean(ctx.generating),
      };
    }

    const primary = ctx.goal.targets.find((t) => t.isPrimary);
    const career = workSimCareerForGoal(primary?.slug, ctx.goal.statement);
    const rituals = buildWorkSimRituals(career, ctx.goal.statement);

    const progress = await this.loadProgress(userId, ctx.goal.id);

    return {
      available: true,
      goal: {
        id: ctx.goal.id,
        statement: ctx.goal.statement,
        primaryTarget: primary ? { slug: primary.slug, label: primary.label } : null,
      },
      career: career ? presentDevCareer(career) : null,
      rituals: rituals.map((r) => ({
        ...r,
        status: progress[r.kind] ?? "pending",
      })),
      completedCount: WORK_SIM_KINDS.filter((k) => progress[k] === "passed").length,
      totalCount: WORK_SIM_KINDS.length,
      note: career
        ? "Simulador alinhado à carreira deste objectivo (stand-up, ticket, PR)."
        : "Simulador genérico de trabalho em equipa — o objectivo actual define o cenário.",
    };
  }

  async submit(userId: string, raw: unknown) {
    const input = parseBody(workSimSubmitSchema, raw);
    const ctx = await resolveCurriculumContext(this.prisma, userId);
    if (!ctx.available) {
      throw new BadRequestException(ctx.message ?? "Objectivo activo necessário.");
    }

    const verdict = evaluateWorkSimSubmit(input);
    const exercise = await this.ensureLab(
      ctx.goal.id,
      input.kind,
      ctx.goal.statement,
      ctx.targetNode.id,
    );

    const workspace = await this.prisma.labWorkspace.upsert({
      where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
      create: {
        userId,
        exerciseId: exercise.id,
        files: {
          create: [{ path: `${input.kind}.md`, content: verdict.evidenceMarkdown }],
        },
      },
      update: {},
    });
    await this.prisma.labFile.deleteMany({ where: { workspaceId: workspace.id } });
    await this.prisma.labFile.create({
      data: {
        workspaceId: workspace.id,
        path: `${input.kind}.md`,
        content: verdict.evidenceMarkdown,
      },
    });

    const run = await this.prisma.labRun.create({
      data: {
        userId,
        exerciseId: exercise.id,
        workspaceId: workspace.id,
        status: verdict.passed ? "passed" : "failed",
        passed: verdict.passed,
        exitCode: verdict.passed ? 0 : 1,
        stdout: verdict.feedback.join("\n"),
        stderr: verdict.passed ? "" : verdict.feedback.join("\n"),
        finishedAt: new Date(),
      },
    });

    if (verdict.passed) {
      await this.applyMastery(userId, exercise.nodeId);
    }

    const status = await this.status(userId);
    return {
      ...status,
      kind: input.kind,
      passed: verdict.passed,
      feedback: verdict.feedback,
      runId: run.id,
      labSlug: exercise.slug,
    };
  }

  private async loadProgress(userId: string, goalId: string) {
    const prefix = `${scopePrefixForGoal(goalId)}worksim-`;
    const exercises = await this.prisma.labExercise.findMany({
      where: { slug: { startsWith: prefix } },
      select: { id: true, slug: true },
    });
    const out: Partial<Record<WorkSimKind, "passed" | "failed" | "pending">> = {};
    for (const kind of WORK_SIM_KINDS) {
      const ex = exercises.find((e) => e.slug.endsWith(`-${kind}`));
      if (!ex) {
        out[kind] = "pending";
        continue;
      }
      const latest = await this.prisma.labRun.findFirst({
        where: { userId, exerciseId: ex.id },
        orderBy: { startedAt: "desc" },
      });
      out[kind] = latest?.passed ? "passed" : latest ? "failed" : "pending";
    }
    return out;
  }

  private async ensureLab(
    goalId: string,
    kind: WorkSimKind,
    statement: string,
    tipNodeId: string,
  ) {
    const slug = `${scopePrefixForGoal(goalId)}worksim-${kind}`;
    const existing = await this.prisma.labExercise.findUnique({
      where: { slug },
      include: { node: true },
    });
    if (existing) return existing;

    const node = (await this.findAnchorNode(goalId, kind)) ?? {
      id: tipNodeId,
    };

    const titles: Record<WorkSimKind, string> = {
      standup: "Simulador — Daily / stand-up",
      ticket: "Simulador — Clarificar ticket",
      pr: "Simulador — PR e review",
    };

    return this.prisma.labExercise.create({
      data: {
        nodeId: node.id,
        slug,
        title: titles[kind],
        prompt: `Ritual de trabalho «${kind}» para o objectivo: ${statement.slice(0, 120)}`,
        language: "guided",
        entryClass: "Evidence",
        starterFiles: [{ path: `${kind}.md`, content: `# ${kind}\n\n` }],
        hiddenFiles: [],
        published: true,
        timeoutMs: 5_000,
      },
      include: { node: true },
    });
  }

  private async findAnchorNode(goalId: string, kind: WorkSimKind) {
    const nodes = await this.prisma.knowledgeNode.findMany({
      where: { goalId },
      orderBy: { sortOrder: "asc" },
    });
    const prefer =
      kind === "pr"
        ? ["carreira-realidade", "soft-skills", "padroes", "tip"]
        : ["soft-skills", "carreira-realidade", "padroes", "tip"];
    for (const key of prefer) {
      const hit = nodes.find((n) => n.slug.includes(key));
      if (hit) return hit;
    }
    return nodes[nodes.length - 1] ?? null;
  }

  private async applyMastery(userId: string, nodeId: string) {
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
        knowledgeScore: 0.65,
        source: "lab",
      },
      update:
        keepPassed && existing
          ? { knowledgeScore: Math.max(existing.knowledgeScore, 0.65) }
          : { status: "passed", knowledgeScore: 0.65, source: "lab" },
    });
  }
}
