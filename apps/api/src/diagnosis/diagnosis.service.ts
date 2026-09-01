import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  MAX_DIAGNOSIS_QUESTIONS,
  ancestorsAndSelf,
  diagnosisAnswerSchema,
  isCustomGoalLabel,
  pickNextQuestion,
  presentDevCareer,
  recommendedStart,
  resolveDevCareer,
  type MasteryStatus,
} from "@programeint/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseBody } from "../common/parse";
import {
  loadScopedGraph,
  resolveCurriculumContext,
} from "../curriculum/curriculum-context";
import { buildTopicDiagnosis } from "../curriculum/curriculum-plan";
import { searchWeb, wikiExtract } from "../curriculum/web-search";
import { ensureVideosForNode } from "../curriculum/ensure-node-videos";

type Choice = { id: string; text: string };

@Injectable()
export class DiagnosisService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async start(userId: string) {
    const ctx = await resolveCurriculumContext(this.prisma, userId);
    if (!ctx.available) {
      return {
        available: false,
        message: ctx.message,
        generating: Boolean(ctx.generating),
      };
    }

    const targetNode = ctx.targetNode;

    // Garante perguntas de diagnóstico alinhadas a ESTE mapa (não genéricas / outros objectivos)
    await this.ensureTopicDiagnosisQuestions(ctx.goal.id, ctx.scopeGoalId, ctx.goal.statement);

    const questionsOnPath = await this.countQuestionsOnPath(targetNode.id, ctx.scopeGoalId);
    if (questionsOnPath === 0) {
      return {
        available: false,
        message: "Este mapa ainda não tem perguntas de diagnóstico para o teu objectivo.",
        goal: goalBrief(ctx),
      };
    }

    const existing = await this.prisma.diagnosisSession.findFirst({
      where: {
        userId,
        status: "in_progress",
        goalId: ctx.goal.id,
        targetNodeId: targetNode.id,
      },
      orderBy: { startedAt: "desc" },
    });
    if (existing) {
      return this.present(existing.id, undefined, ctx);
    }

    // Abandona sessões a meio de OUTROS objectivos (não misturar)
    await this.prisma.diagnosisSession.updateMany({
      where: {
        userId,
        status: "in_progress",
        goalId: { not: ctx.goal.id },
      },
      data: { status: "abandoned" },
    });

    const session = await this.prisma.diagnosisSession.create({
      data: {
        userId,
        goalId: ctx.goal.id,
        targetNodeId: targetNode.id,
        status: "in_progress",
        askedCount: 0,
        skippedNodeIds: [],
      },
    });
    await this.advance(session.id);
    return this.present(session.id, undefined, ctx);
  }

  async answer(userId: string, sessionId: string, raw: unknown) {
    const input = parseBody(diagnosisAnswerSchema, raw);
    const session = await this.prisma.diagnosisSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundException("Sessão de diagnóstico não encontrada.");
    if (session.status !== "in_progress") {
      throw new BadRequestException("Esta sessão já terminou.");
    }
    if (session.currentQuestionId !== input.questionId) {
      throw new BadRequestException("Esta não é a questão atual.");
    }

    const question = await this.prisma.question.findUnique({ where: { id: input.questionId } });
    if (!question) throw new NotFoundException("Questão não encontrada.");

    const isCorrect = question.correctChoiceId === input.choiceId;
    await this.prisma.diagnosisAnswer.create({
      data: {
        sessionId: session.id,
        questionId: question.id,
        nodeId: question.nodeId,
        choiceId: input.choiceId,
        isCorrect,
      },
    });

    await this.prisma.nodeMastery.upsert({
      where: { userId_nodeId: { userId, nodeId: question.nodeId } },
      create: {
        userId,
        nodeId: question.nodeId,
        status: isCorrect ? "passed" : "failed",
        knowledgeScore: isCorrect ? 0.6 : 0.15,
        source: "diagnosis",
      },
      update: {
        status: isCorrect ? "passed" : "failed",
        knowledgeScore: isCorrect ? 0.6 : 0.15,
        source: "diagnosis",
      },
    });

    await this.prisma.diagnosisSession.update({
      where: { id: session.id },
      data: { askedCount: session.askedCount + 1, currentQuestionId: null },
    });

    await this.advance(session.id);
    return this.present(session.id, {
      last: {
        correct: isCorrect,
        explanation: question.explanation,
      },
    });
  }

  async roadmap(userId: string) {
    const ctx = await resolveCurriculumContext(this.prisma, userId);
    if (!ctx.available) {
      return {
        available: false as const,
        message: ctx.message,
        generating: Boolean(ctx.generating),
      };
    }
    const { targetNode, scopeGoalId, goal } = ctx;
    const graph = await this.loadGraph(scopeGoalId);
    const [modules, labs, masteryRows, latest, inProgress, videos] = await Promise.all([
      this.prisma.learningModule.findMany({
        where: { published: true, node: scopeGoalId ? { goalId: scopeGoalId } : { goalId: null } },
        select: { nodeId: true, body: true, summary: true, title: true },
      }),
      this.prisma.labExercise.findMany({ where: { published: true }, select: { nodeId: true, slug: true } }),
      this.prisma.nodeMastery.findMany({ where: { userId } }),
      this.prisma.diagnosisSession.findFirst({
        where: { userId, status: "completed", goalId: goal.id },
        orderBy: { completedAt: "desc" },
      }),
      this.prisma.diagnosisSession.findFirst({
        where: { userId, status: "in_progress", goalId: goal.id },
      }),
      this.prisma.studyVideo.groupBy({
        by: ["nodeId"],
        where: { node: scopeGoalId ? { goalId: scopeGoalId } : { goalId: null } },
        _count: { _all: true },
      }),
    ]);
    const published = new Set(modules.map((item) => item.nodeId));
    const moduleByNode = new Map(modules.map((item) => [item.nodeId, item]));
    const videoCountByNode = new Map(videos.map((item) => [item.nodeId, item._count._all]));
    const labByNode = new Map(labs.map((item) => [item.nodeId, item.slug]));
    const nodeIdSet = new Set(graph.nodes.map((n) => n.id));
    const mastery = Object.fromEntries(
      masteryRows
        .filter((row) => nodeIdSet.has(row.nodeId))
        .map((row) => [row.nodeId, row.status as MasteryStatus]),
    );

    const studied = masteryRows.filter(
      (row) => nodeIdSet.has(row.nodeId) && ["studied", "passed"].includes(row.status),
    ).length;
    const totalNodes = graph.nodes.length || 1;

    const nodes = graph.nodes.map((node) => {
      const mod = moduleByNode.get(node.id);
      const preview = mod
        ? mod.body
            .replace(/^#+\s.*/gm, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 320)
        : node.summary;
      return {
        id: node.id,
        slug: node.slug,
        title: node.title,
        summary: node.summary,
        area: node.area,
        sortOrder: node.sortOrder,
        status: mastery[node.id] ?? "unassessed",
        hasModule: published.has(node.id),
        labSlug: labByNode.get(node.id) ?? null,
        videoCount: videoCountByNode.get(node.id) ?? 0,
        modulePreview: preview || null,
        prerequisites: graph.prereqs
          .filter((item) => item.nodeId === node.id)
          .map((item) => ({
            slug: graph.nodes.find((candidate) => candidate.id === item.prerequisiteId)?.slug ?? "",
            nature: item.nature,
          })),
      };
    });

    const recId = recommendedStart({
      targetNodeId: targetNode.id,
      prereqs: graph.prereqs,
      mastery,
    });
    const rec = graph.nodes.find((node) => node.id === recId);

    // Pré-carrega vídeos do nó em foco + vizinhos
    const topic = isCustomGoalLabel(goal.targets.find((t) => t.isPrimary)?.label)
        ? goal.statement.replace(/^quero (aprender|estudar)\s+/i, "").slice(0, 80)
        : (goal.targets.find((t) => t.isPrimary)?.label ?? goal.statement).slice(0, 80);
    const warmupNodes = [rec, targetNode, ...graph.nodes.slice(0, 2)].filter(Boolean);
    for (const warm of warmupNodes) {
      if (!warm) continue;
      void ensureVideosForNode(this.prisma, warm.id, {
        title: warm.title,
        topic,
      }).catch(() => undefined);
    }

    const primary = goal.targets.find((t) => t.isPrimary);
    const careerProfile = resolveDevCareer(primary?.slug, goal.statement);

    return {
      available: true,
      diagnosisCompleted: Boolean(latest),
      diagnosisInProgress: Boolean(inProgress),
      target: { slug: targetNode.slug, title: targetNode.title },
      goalStatement: goal.statement,
      curriculumSource: goal.curriculumSource,
      curriculumNote: goal.curriculumNote,
      career: careerProfile ? presentDevCareer(careerProfile) : null,
      progress: {
        studied,
        total: totalNodes,
        progressPct: Math.round((studied / totalNodes) * 100),
      },
      recommendedStart: rec
        ? { slug: rec.slug, title: rec.title, status: mastery[rec.id] ?? "unassessed" }
        : null,
      nodes,
    };
  }

  private async present(
    sessionId: string,
    extra?: { last?: { correct: boolean; explanation: string } },
    ctx?: {
      goal: {
        id: string;
        statement: string;
        targets: Array<{ slug: string; label: string; isPrimary: boolean }>;
      };
      targetNode: { title: string };
    },
  ) {
    const session = await this.prisma.diagnosisSession.findUnique({
      where: { id: sessionId },
      include: { goal: { include: { targets: true } }, targetNode: true },
    });
    if (!session) throw new NotFoundException("Sessão não encontrada.");

    const goalInfo = ctx
      ? goalBrief(ctx)
      : {
          id: session.goalId,
          statement: session.goal.statement,
          primaryLabel: session.goal.targets.find((t) => t.isPrimary)?.label ?? null,
          targetTitle: session.targetNode.title,
        };

    if (session.status === "completed") {
      const rec = await this.recommendation(session.userId, session.targetNodeId);
      return {
        available: true,
        sessionId: session.id,
        status: session.status,
        askedCount: session.askedCount,
        maxQuestions: MAX_DIAGNOSIS_QUESTIONS,
        question: null,
        recommendedStart: rec,
        last: extra?.last,
        goal: goalInfo,
      };
    }

    if (!session.currentQuestionId) {
      await this.advance(session.id);
      const refreshed = await this.prisma.diagnosisSession.findUnique({ where: { id: session.id } });
      if (!refreshed?.currentQuestionId) {
        const rec = await this.recommendation(session.userId, session.targetNodeId);
        return {
          available: true,
          sessionId: session.id,
          status: "completed",
          askedCount: session.askedCount,
          maxQuestions: MAX_DIAGNOSIS_QUESTIONS,
          question: null,
          recommendedStart: rec,
          last: extra?.last,
          goal: goalInfo,
        };
      }
    }

    const currentId = (await this.prisma.diagnosisSession.findUnique({ where: { id: session.id } }))
      ?.currentQuestionId;
    const question = currentId
      ? await this.prisma.question.findUnique({
          where: { id: currentId },
          include: { node: true },
        })
      : null;

    return {
      available: true,
      sessionId: session.id,
      status: "in_progress",
      askedCount: session.askedCount,
      maxQuestions: MAX_DIAGNOSIS_QUESTIONS,
      question: question
        ? {
            id: question.id,
            nodeTitle: question.node.title,
            prompt: question.prompt,
            code: question.code,
            choices: question.choices as Choice[],
          }
        : null,
      last: extra?.last,
      goal: goalInfo,
    };
  }

  /** Garante perguntas de diagnóstico de CONTEÚDO do mapa actual (não meta-estudo). */
  private async ensureTopicDiagnosisQuestions(
    goalId: string,
    scopeGoalId: string | null,
    statement: string,
  ) {
    void goalId;
    const nodes = await this.prisma.knowledgeNode.findMany({
      where: scopeGoalId ? { goalId: scopeGoalId } : { goalId: null },
      include: {
        questions: { where: { kind: "diagnosis", active: true } },
      },
    });

    const topic =
      statement.replace(/^quero (aprender|estudar)\s+/i, "").slice(0, 80) || statement;

    for (const node of nodes) {
      const key = inferNodeKey(node.slug);
      const needsContent =
        node.questions.length === 0 ||
        node.questions.some((q) => !isContentDiagnosisPrompt(q.prompt));

      let factHint: string | undefined;
      if (needsContent) {
        const query = `${topic} ${node.title}`.slice(0, 100);
        const [wiki, hits] = await Promise.all([wikiExtract(query), searchWeb(query, 2)]);
        factHint = wiki?.extract ?? hits[0]?.snippet;
      }

      const rebuilt = buildTopicDiagnosis({
        title: node.title,
        topic,
        key,
        statement,
        factHint,
      });

      if (node.questions.length === 0) {
        await this.prisma.question.create({
          data: {
            slug: `${node.slug}-diag`,
            nodeId: node.id,
            kind: "diagnosis",
            prompt: rebuilt.checkPrompt,
            choices: rebuilt.checkChoices,
            correctChoiceId: rebuilt.correctChoiceId,
            explanation: rebuilt.checkExplanation,
            active: true,
          },
        });
        continue;
      }

      for (const question of node.questions) {
        if (isContentDiagnosisPrompt(question.prompt) && !isMethodologyDiagnosisPrompt(question.prompt)) {
          continue;
        }
        await this.prisma.question.update({
          where: { id: question.id },
          data: {
            prompt: rebuilt.checkPrompt,
            choices: rebuilt.checkChoices,
            correctChoiceId: rebuilt.correctChoiceId,
            explanation: rebuilt.checkExplanation,
          },
        });
      }
    }
  }

  private async advance(sessionId: string) {
    const session = await this.prisma.diagnosisSession.findUnique({
      where: { id: sessionId },
      include: { answers: true, targetNode: true },
    });
    if (!session || session.status !== "in_progress") return;

    const graph = await this.loadGraph(session.targetNode.goalId ?? null);
    let skipped = [...session.skippedNodeIds];
    let askedCount = session.askedCount;
    let safety = 0;
    while (safety < 20) {
      safety += 1;
      const mastery: Record<string, MasteryStatus> = {};
      for (const id of skipped) mastery[id] = "skipped";
      for (const answer of session.answers) {
        mastery[answer.nodeId] = answer.isCorrect ? "passed" : "failed";
      }
      const answered = await this.prisma.diagnosisAnswer.findMany({
        where: { sessionId: session.id },
        select: { questionId: true },
      });
      const answeredIds = new Set(answered.map((item) => item.questionId));
      const unusedQuestions: Record<string, string[]> = {};
      for (const question of graph.questions) {
        if (!question.active || answeredIds.has(question.id)) continue;
        unusedQuestions[question.nodeId] ??= [];
        unusedQuestions[question.nodeId]!.push(question.id);
      }

      const next = pickNextQuestion({
        targetNodeId: session.targetNodeId,
        nodes: graph.nodes,
        prereqs: graph.prereqs,
        mastery,
        unusedQuestions,
        askedCount,
        maxQuestions: MAX_DIAGNOSIS_QUESTIONS,
      });

      if (!next) {
        await this.prisma.diagnosisSession.update({
          where: { id: session.id },
          data: { status: "completed", completedAt: new Date(), currentQuestionId: null },
        });
        await this.prisma.diagnosisSession.deleteMany({
          where: {
            userId: session.userId,
            goalId: session.goalId,
            status: "in_progress",
            id: { not: session.id },
            askedCount: 0,
          },
        });
        return;
      }

      if ("skipNodeId" in next) {
        skipped = [...skipped, next.skipNodeId];
        await this.prisma.nodeMastery.upsert({
          where: { userId_nodeId: { userId: session.userId, nodeId: next.skipNodeId } },
          create: {
            userId: session.userId,
            nodeId: next.skipNodeId,
            status: "skipped",
            knowledgeScore: 0,
            source: "diagnosis",
          },
          update: { status: "skipped", source: "diagnosis" },
        });
        await this.prisma.diagnosisSession.update({
          where: { id: session.id },
          data: { skippedNodeIds: skipped },
        });
        continue;
      }

      await this.prisma.diagnosisSession.update({
        where: { id: session.id },
        data: { currentQuestionId: next.questionId },
      });
      return;
    }
  }

  private async recommendation(userId: string, targetNodeId: string) {
    const tip = await this.prisma.knowledgeNode.findUnique({ where: { id: targetNodeId } });
    const graph = await this.loadGraph(tip?.goalId ?? null);
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    const masteryRows = await this.prisma.nodeMastery.findMany({
      where: { userId, nodeId: { in: [...nodeIds] } },
    });
    const mastery = Object.fromEntries(
      masteryRows.map((row) => [row.nodeId, row.status as MasteryStatus]),
    );
    const id = recommendedStart({ targetNodeId, prereqs: graph.prereqs, mastery });
    const node = graph.nodes.find((item) => item.id === id);
    return node ? { slug: node.slug, title: node.title } : null;
  }

  private async loadGraph(scopeGoalId: string | null = null) {
    const scoped = await loadScopedGraph(this.prisma, scopeGoalId);
    const questions = await this.prisma.question.findMany({
      where: {
        active: true,
        kind: "diagnosis",
        node: scopeGoalId ? { goalId: scopeGoalId } : { goalId: null },
      },
    });
    return { ...scoped, questions };
  }

  private async countQuestionsOnPath(targetNodeId: string, scopeGoalId: string | null) {
    const graph = await this.loadGraph(scopeGoalId);
    const path = ancestorsAndSelf(targetNodeId, graph.prereqs);
    return graph.questions.filter((item) => path.has(item.nodeId)).length;
  }
}

function goalBrief(ctx: {
  goal: {
    id: string;
    statement: string;
    targets: Array<{ slug: string; label: string; isPrimary: boolean }>;
  };
  targetNode: { title: string };
}) {
  return {
    id: ctx.goal.id,
    statement: ctx.goal.statement,
    primaryLabel: ctx.goal.targets.find((t) => t.isPrimary)?.label ?? null,
    targetTitle: ctx.targetNode.title,
  };
}

function isContentDiagnosisPrompt(prompt: string): boolean {
  return (
    /afirmação sobre o conteúdo/i.test(prompt) ||
    /descreve melhor o conteúdo/i.test(prompt) ||
    /afirmação de conteúdo/i.test(prompt) ||
    /descrição de conteúdo/i.test(prompt) ||
    /conteúdo esperado/i.test(prompt) ||
    /resume que conteúdo/i.test(prompt) ||
    /Sobre «.+» no mapa de/i.test(prompt) ||
    /o que é verdade\?/i.test(prompt)
  );
}

function isMethodologyDiagnosisPrompt(prompt: string): boolean {
  return (
    /demonstra domínio real/i.test(prompt) ||
    /módulo verificado/i.test(prompt) ||
    /Memorizar o título do módulo/i.test(prompt) ||
    /Ver um vídeo até ao fim sem praticar/i.test(prompt) ||
    /estudo baseado em evidência/i.test(prompt) ||
    /o que deve vir primeiro/i.test(prompt) ||
    /o que demonstra compreensão/i.test(prompt) ||
    /o que conta como progresso/i.test(prompt) ||
    /misturar (matérias|objectivos|conteúdos)/i.test(prompt) ||
    /Trocar de objectivo/i.test(prompt) ||
    /Perceber que problema/i.test(prompt) ||
    /evidência pontual/i.test(prompt)
  );
}

function inferNodeKey(slug: string): string {
  const keys = [
    "fundamentos",
    "conceitos-core",
    "ferramentas",
    "pratica-guiada",
    "padroes",
    "projecto",
    "tip",
  ];
  for (const key of keys) {
    if (slug.includes(key)) return key;
  }
  return "conceitos-core";
}
