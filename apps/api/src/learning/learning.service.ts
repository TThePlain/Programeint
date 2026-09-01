import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  hrefForAction,
  isCustomGoalLabel,
  pickNextAction,
  recommendedLab,
  recommendedProject,
  recommendedStudy,
  requiredPrereqsOf,
  reviewAnswerSchema,
  reviewCard,
  studyCheckSchema,
  studyStartSchema,
  studyVideosForNode,
  studyVideoLanguagesForNode,
  STUDY_VIDEO_LANGUAGES,
  youtubeEmbedUrl,
  type MasteryStatus,
  type StoredFsrsCard,
} from "@programeint/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseBody } from "../common/parse";
import {
  loadScopedGraph,
  resolveCurriculumContext,
  scopedNodeIds,
  assertNodeInUserScope,
} from "../curriculum/curriculum-context";
import { buildLessonBody } from "../curriculum/curriculum-plan";
import { ensureVideosForNode, capVideosPerLanguage } from "../curriculum/ensure-node-videos";
import { hitMatchesLanguage, type VideoLang } from "../curriculum/video-language";
import { searchWeb, wikiExtract, fetchTopicImage } from "../curriculum/web-search";

type Choice = { id: string; text: string };

@Injectable()
export class LearningService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async next(userId: string) {
    const ctx = await resolveCurriculumContext(this.prisma, userId);
    if (!ctx.available) {
      const action = pickNextAction({
        curriculumAvailable: false,
        diagnosisInProgress: false,
        diagnosisCompleted: false,
        studyInProgress: null,
        dueReview: null,
        pendingLab: null,
        pendingProject: null,
        studyNode: null,
        modulePublished: false,
      });
      return {
        ...action,
        href: hrefForAction(action),
        label: ctx.message,
        message: ctx.message,
        question: null,
        generating: Boolean(ctx.generating),
      };
    }

    const nodeScope = ctx.scopeGoalId
      ? { goalId: ctx.scopeGoalId }
      : { goalId: null as string | null };
    const diagnosisCompleted = await this.prisma.diagnosisSession.findFirst({
      where: { userId, status: "completed", goalId: ctx.goal.id },
      orderBy: { completedAt: "desc" },
    });
    if (diagnosisCompleted?.completedAt) {
      await this.prisma.diagnosisSession.deleteMany({
        where: {
          userId,
          goalId: ctx.goal.id,
          status: "in_progress",
          askedCount: 0,
          startedAt: { lt: diagnosisCompleted.completedAt },
        },
      });
    }
    const completedModules = await this.prisma.studySession.findMany({
      where: {
        userId,
        status: "completed",
        node: nodeScope,
      },
      select: { moduleId: true },
    });
    if (completedModules.length > 0) {
      await this.prisma.studySession.updateMany({
        where: {
          userId,
          status: "in_progress",
          moduleId: { in: completedModules.map((item) => item.moduleId) },
          node: nodeScope,
        },
        data: { status: "abandoned" },
      });
    }

    const [diagnosisInProgress, studyRow, dueRow, masteryRows, modules, exercises, passedLabs, projects, passedProjects] =
      await Promise.all([
      this.prisma.diagnosisSession.findFirst({
        where: { userId, status: "in_progress", goalId: ctx.goal.id },
      }),
        this.prisma.studySession.findFirst({
          where: { userId, status: "in_progress", node: nodeScope },
          include: { node: true, module: true },
        }),
        this.prisma.fsrsCard.findFirst({
          where: { userId, due: { lte: new Date() } },
          orderBy: { due: "asc" },
          include: { question: { include: { node: true } } },
        }),
        this.prisma.nodeMastery.findMany({
          where: {
            userId,
            node: nodeScope,
          },
        }),
        this.prisma.learningModule.findMany({
          where: { published: true, node: nodeScope },
        }),
        this.prisma.labExercise.findMany({ where: { published: true }, include: { node: true } }),
        this.prisma.labRun.findMany({
          where: { userId, passed: true },
          select: { exerciseId: true },
        }),
        this.prisma.portfolioProject.findMany({
          where: { published: true },
          include: { requirements: true },
          orderBy: { sortOrder: "asc" },
        }),
        this.prisma.portfolioEvidence.findMany({
          where: { userId },
          include: { project: true },
        }),
      ]);

    const graph = await loadScopedGraph(this.prisma, ctx.scopeGoalId);
    const mastery = Object.fromEntries(
      masteryRows.map((row) => [row.nodeId, row.status as MasteryStatus]),
    );
    const published = new Set(modules.map((item) => item.nodeId));
    const studyNodeId = recommendedStudy({
      targetNodeId: ctx.targetNode.id,
      prereqs: graph.prereqs,
      mastery,
      publishedNodeIds: published,
    });
    const studyNode = studyNodeId ? graph.nodes.find((node) => node.id === studyNodeId) : null;
    const passedExerciseIds = new Set(passedLabs.map((row) => row.exerciseId));
    const labNodeId = recommendedLab({
      targetNodeId: ctx.targetNode.id,
      prereqs: graph.prereqs,
      mastery,
      labNodeIds: new Set(exercises.map((item) => item.nodeId)),
      passedLabNodeIds: new Set(
        exercises.filter((item) => passedExerciseIds.has(item.id)).map((item) => item.nodeId),
      ),
    });
    const labExercise = labNodeId ? exercises.find((item) => item.nodeId === labNodeId) : null;
    const pending = recommendedProject({
      projects: projects.map((item) => ({
        slug: item.slug,
        title: item.title,
        requiredNodeIds: item.requirements.map((req) => req.nodeId),
      })),
      mastery,
      passedProjectSlugs: new Set(passedProjects.map((row) => row.project.slug)),
    });

    const action = pickNextAction({
      curriculumAvailable: true,
      diagnosisInProgress: Boolean(diagnosisInProgress),
      diagnosisCompleted: Boolean(diagnosisCompleted),
      studyInProgress: studyRow
        ? { nodeSlug: studyRow.node.slug, nodeTitle: studyRow.node.title }
        : null,
      dueReview: dueRow
        ? {
            questionId: dueRow.questionId,
            nodeSlug: dueRow.question.node.slug,
            nodeTitle: dueRow.question.node.title,
          }
        : null,
      pendingLab: labExercise
        ? {
            exerciseSlug: labExercise.slug,
            nodeSlug: labExercise.node.slug,
            nodeTitle: labExercise.node.title,
          }
        : null,
      pendingProject: pending
        ? { projectSlug: pending.slug, title: pending.title }
        : null,
      studyNode: studyNode ? { slug: studyNode.slug, title: studyNode.title } : null,
      modulePublished: studyNode ? published.has(studyNode.id) : false,
    });

    const question =
      action.kind === "review_due" && dueRow
        ? {
            id: dueRow.question.id,
            nodeTitle: dueRow.question.node.title,
            prompt: dueRow.question.prompt,
            code: dueRow.question.code,
            choices: dueRow.question.choices as Choice[],
          }
        : null;

    return {
      ...action,
      href: hrefForAction(action),
      label: this.labelFor(action.kind, action.nodeTitle),
      message: this.messageFor(action.kind, action.nodeTitle),
      question,
    };
  }

  async modulePreview(userId: string, nodeSlug: string) {
    const ctx = await resolveCurriculumContext(this.prisma, userId);
    if (!ctx.available) {
      throw new BadRequestException(ctx.message);
    }
    const node = await this.prisma.knowledgeNode.findUnique({ where: { slug: nodeSlug } });
    if (!node) throw new NotFoundException("Nó não encontrado.");
    if ((node.goalId ?? null) !== ctx.scopeGoalId) {
      throw new BadRequestException("Este nó não faz parte do objectivo em foco.");
    }
    const module = await this.prisma.learningModule.findFirst({
      where: { nodeId: node.id, published: true },
    });
    if (!module) {
      throw new NotFoundException("Este nó ainda não tem módulo publicado.");
    }
    const resources = await this.prisma.learningResource.findMany({
      where: { published: true, nodes: { some: { nodeId: node.id } } },
      take: 8,
      orderBy: { title: "asc" },
      select: {
        slug: true,
        title: true,
        url: true,
        publisher: true,
        kind: true,
        summary: true,
      },
    });
    const videoCount = await this.prisma.studyVideo.count({ where: { nodeId: node.id } });
    return {
      node: { slug: node.slug, title: node.title, summary: node.summary },
      module: {
        slug: module.slug,
        title: module.title,
        summary: module.summary,
        body: module.body,
        preview: module.body.replace(/\s+/g, " ").trim().slice(0, 480),
      },
      resources,
      videoCount,
      goal: {
        statement: ctx.goal.statement,
        primaryLabel: ctx.goal.targets.find((t) => t.isPrimary)?.label ?? null,
      },
    };
  }

  async start(userId: string, raw: unknown) {
    const input = parseBody(studyStartSchema, raw);
    const ctx = await resolveCurriculumContext(this.prisma, userId);
    if (!ctx.available) {
      throw new BadRequestException(ctx.message);
    }

    const node = await this.prisma.knowledgeNode.findUnique({
      where: { slug: input.nodeSlug },
    });
    if (!node) {
      throw new NotFoundException("Nó de estudo não encontrado.");
    }

    // Não misturar: nó tem de pertencer ao objectivo actual (ou grafo seed se Java)
    const expectedGoalId = ctx.scopeGoalId;
    if ((node.goalId ?? null) !== expectedGoalId) {
      throw new BadRequestException(
        "Este nó não faz parte do objectivo em foco. Troca de objectivo ou abre o mapa correcto.",
      );
    }

    // Módulo pelo nó (seed: slug=node; gerado: nodeId único) — nunca pelo slug do módulo só.
    const module = await this.prisma.learningModule.findFirst({
      where: { nodeId: node.id, published: true },
      include: { node: true, checkQuestion: { include: { node: true } } },
    });
    if (!module) {
      throw new NotFoundException(
        "Este nó ainda não tem módulo publicado. Não há aula inventada no lugar.",
      );
    }

    // Não bloquear o estudo com pesquisa/YouTube — texto primeiro, vídeos em background
    if (module.node.goalId && isThinModuleBody(module.body)) {
      const goal = await this.prisma.goal.findUnique({
        where: { id: module.node.goalId },
        include: { targets: true },
      });
      const topic = isCustomGoalLabel(goal?.targets.find((t) => t.isPrimary)?.label)
          ? (goal?.statement ?? module.node.title).replace(/^quero (aprender|estudar)\s+/i, "").slice(0, 80)
          : (goal?.targets.find((t) => t.isPrimary)?.label ?? goal?.statement ?? module.node.title);
      const keyMatch = module.node.slug.match(
        /(fundamentos|conceitos-core|ferramentas|pratica-guiada|padroes|projecto|tip)/,
      );
      void this.refreshGeneratedModule(module.id, module.node.title, module.node.summary, {
        statement: goal?.statement ?? module.node.summary,
        topic,
        key: keyMatch?.[1] ?? "conceitos-core",
        nodeId: module.nodeId,
      }).catch(() => undefined);
    } else if (!/!\[[^\]]*\]\(https?:\/\//i.test(module.body)) {
      void this.ensureLessonCoverImage(module.id, module.body, module.node.title).catch(() => undefined);
    }

    const goalForVideo = module.node.goalId
      ? await this.prisma.goal.findUnique({
          where: { id: module.node.goalId },
          include: { targets: true },
        })
      : null;
    const primaryVideoLabel = goalForVideo?.targets.find((t) => t.isPrimary)?.label;
    const videoTopic =
      primaryVideoLabel && !isCustomGoalLabel(primaryVideoLabel)
        ? primaryVideoLabel
        : goalForVideo?.statement?.replace(/^quero (aprender|estudar)\s+/i, "").slice(0, 80) ||
          module.node.title;
    void ensureVideosForNode(this.prisma, module.nodeId, {
      title: module.node.title,
      topic: videoTopic,
    }).catch(() => undefined);

    const ready = module;

    const sessionId = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(8713, hashtext(${userId}))`;
      const existing = await tx.studySession.findFirst({
        where: { userId, status: "in_progress" },
        orderBy: { startedAt: "asc" },
      });
      if (existing && existing.moduleId === ready.id) return existing.id;
      if (existing) {
        await tx.studySession.update({
          where: { id: existing.id },
          data: { status: "abandoned" },
        });
      }
      const created = await tx.studySession.create({
        data: {
          userId,
          moduleId: ready.id,
          nodeId: ready.nodeId,
          status: "in_progress",
        },
      });
      return created.id;
    });
    return this.presentSession(sessionId);
  }

  /** Reescreve corpo do módulo gerado com pesquisa do próprio nó (mapa → estudar). */
  private async refreshGeneratedModule(
    moduleId: string,
    title: string,
    summary: string,
    opts?: { statement?: string; topic?: string; key?: string; nodeId?: string },
  ) {
    const topic = opts?.topic || title;
    const statement = opts?.statement || summary || title;
    const key = opts?.key || "conceitos-core";
    const query = `${topic} ${title}`.slice(0, 100);
    const [wiki, hits, docs] = await Promise.all([
      wikiExtract(query),
      searchWeb(query, 5),
      opts?.nodeId
        ? this.prisma.learningResource.findMany({
            where: { published: true, nodes: { some: { nodeId: opts.nodeId } } },
            take: 6,
            select: { title: true, url: true, publisher: true },
          })
        : Promise.resolve([]),
    ]);
    const body = buildLessonBody({
      title,
      key,
      topic,
      statement,
      levelNote: "Módulo preparado a partir da pesquisa do teu mapa de estudo personalizado.",
      wiki,
      hits:
        hits.length > 0
          ? hits
          : [{ title, snippet: summary || "Conteúdo alinhado ao nó do mapa." }],
      documents: docs,
    });
    await this.prisma.learningModule.update({
      where: { id: moduleId },
      data: { body },
    });
  }

  /** Acrescenta imagem real (Wikipedia/DDG) a aulas que ainda não têm ilustração. */
  private async ensureLessonCoverImage(moduleId: string, body: string, title: string) {
    const imageUrl = await fetchTopicImage(title);
    if (!imageUrl) return;
    const imageMd = `![${title}](${imageUrl})`;
    const withImage = /^# .+/m.test(body)
      ? body.replace(/^(# [^\n]+)\n+/, `$1\n\n${imageMd}\n\n`)
      : `${imageMd}\n\n${body}`;
    await this.prisma.learningModule.update({
      where: { id: moduleId },
      data: { body: withImage },
    });
  }

  async markRead(userId: string, sessionId: string) {
    const session = await this.requireSession(userId, sessionId);
    if (session.status !== "in_progress") {
      throw new BadRequestException("Esta sessão de estudo já terminou.");
    }
    await this.prisma.studySession.update({
      where: { id: session.id },
      data: { readAt: session.readAt ?? new Date() },
    });
    return this.presentSession(session.id);
  }

  async check(userId: string, sessionId: string, raw: unknown) {
    const input = parseBody(studyCheckSchema, raw);
    const session = await this.requireSession(userId, sessionId);
    if (session.status !== "in_progress") {
      throw new BadRequestException("Esta sessão de estudo já terminou.");
    }
    if (!session.readAt) {
      throw new BadRequestException("Lê o módulo antes da verificação. Ler não é domínio, mas é o passo.");
    }

    const question = session.module.checkQuestion;
    if (question.id !== input.questionId) {
      throw new BadRequestException("Esta não é a questão de verificação deste módulo.");
    }

    const isCorrect = question.correctChoiceId === input.choiceId;
    await this.prisma.studySession.update({
      where: { id: session.id },
      data: {
        checkAnsweredAt: new Date(),
        checkCorrect: isCorrect,
        status: isCorrect ? "completed" : "in_progress",
        completedAt: isCorrect ? new Date() : null,
      },
    });

    if (isCorrect) {
      await this.prisma.studySession.updateMany({
        where: { userId, status: "in_progress", id: { not: session.id } },
        data: { status: "abandoned" },
      });
      await this.applyStudyMastery(userId, session.nodeId);
    }
    await this.scheduleFsrs(userId, question.id, isCorrect);

    return this.presentSession(session.id, {
      last: { correct: isCorrect, explanation: question.explanation },
    });
  }

  async review(userId: string, raw: unknown) {
    const input = parseBody(reviewAnswerSchema, raw);
    const card = await this.prisma.fsrsCard.findUnique({
      where: { userId_questionId: { userId, questionId: input.questionId } },
      include: { question: { include: { node: true } } },
    });
    if (!card) throw new NotFoundException("Não há carta FSRS para esta questão.");
    if (card.due > new Date()) {
      throw new BadRequestException("Esta revisão ainda não está vencida.");
    }

    const isCorrect = card.question.correctChoiceId === input.choiceId;
    await this.scheduleFsrs(userId, card.questionId, isCorrect);
    const next = await this.next(userId);
    return {
      ...next,
      last: { correct: isCorrect, explanation: card.question.explanation },
    };
  }

  private async presentSession(
    sessionId: string,
    extra?: { last?: { correct: boolean; explanation: string } },
  ) {
    const session = await this.prisma.studySession.findUnique({
      where: { id: sessionId },
      include: {
        node: true,
        module: { include: { checkQuestion: { include: { node: true } } } },
      },
    });
    if (!session) throw new NotFoundException("Sessão de estudo não encontrada.");

    const graph = await loadScopedGraph(this.prisma, session.node.goalId ?? null);
    const masteryRows = await this.prisma.nodeMastery.findMany({
      where: {
        userId: session.userId,
        nodeId: { in: graph.nodes.map((n) => n.id) },
      },
    });
    const mastery = Object.fromEntries(
      masteryRows.map((row) => [row.nodeId, row.status as MasteryStatus]),
    );
    const required = requiredPrereqsOf(session.nodeId, graph.prereqs);
    const failedPrereqs = required
      .filter((id) => mastery[id] === "failed")
      .map((id) => graph.nodes.find((node) => node.id === id)?.title)
      .filter(Boolean);

    const studiedCount = masteryRows.filter((row) =>
      ["studied", "passed"].includes(row.status),
    ).length;
    const totalNodes = graph.nodes.length || 1;

    const goalRow = session.node.goalId
      ? await this.prisma.goal.findUnique({
          where: { id: session.node.goalId },
          include: { targets: true },
        })
      : null;
    const ctxFallback = goalRow
      ? null
      : await resolveCurriculumContext(this.prisma, session.userId);
    const goalStatement =
      goalRow?.statement ??
      (ctxFallback?.available ? ctxFallback.goal.statement : null);
    const primaryLabel =
      goalRow?.targets.find((t) => t.isPrimary)?.label ??
      (ctxFallback?.available
        ? ctxFallback.goal.targets.find((t) => t.isPrimary)?.label ?? null
        : null);

    const resources = await this.prisma.learningResource.findMany({
      where: {
        published: true,
        nodes: { some: { nodeId: session.nodeId } },
      },
      orderBy: { title: "asc" },
      take: 8,
      select: {
        slug: true,
        title: true,
        url: true,
        publisher: true,
        kind: true,
        summary: true,
      },
    });

    const q = session.module.checkQuestion;

    const lab = await this.prisma.labExercise.findFirst({
      where: { nodeId: session.nodeId, published: true },
      select: { slug: true },
    });

    return {
      sessionId: session.id,
      status: session.status,
      read: Boolean(session.readAt),
      checkCorrect: session.checkCorrect,
      warning:
        failedPrereqs.length > 0
          ? `Pré-requisito falhou no diagnóstico (${failedPrereqs.join(", ")}). Podes estudar na mesma: o sistema recomenda, tu decides.`
          : null,
      goal: goalStatement
        ? {
            statement: goalStatement,
            primaryLabel,
          }
        : null,
      progress: {
        studied: studiedCount,
        total: totalNodes,
        progressPct: Math.round((studiedCount / totalNodes) * 100),
        currentTitle: session.node.title,
      },
      resources: resources.map((item) => ({
        slug: item.slug,
        title: item.title,
        url: item.url,
        publisher: item.publisher,
        kind: item.kind,
        summary: item.summary,
      })),
      labSlug: lab?.slug ?? null,
      node: { slug: session.node.slug, title: session.node.title },
      module: {
        slug: session.module.slug,
        title: session.module.title,
        summary: session.module.summary,
        body: session.module.body,
      },
      question: session.readAt
        ? {
            id: q.id,
            nodeTitle: q.node.title,
            prompt: q.prompt,
            code: q.code,
            choices: q.choices as Choice[],
          }
        : null,
      last: extra?.last,
    };
  }

  private async requireSession(userId: string, sessionId: string) {
    const session = await this.prisma.studySession.findFirst({
      where: { id: sessionId, userId },
      include: {
        node: true,
        module: { include: { checkQuestion: { include: { node: true } } } },
      },
    });
    if (!session) throw new NotFoundException("Sessão de estudo não encontrada.");
    return session;
  }

  private async applyStudyMastery(userId: string, nodeId: string) {
    const existing = await this.prisma.nodeMastery.findUnique({
      where: { userId_nodeId: { userId, nodeId } },
    });
    const keepPassed = existing?.status === "passed";
    await this.prisma.nodeMastery.upsert({
      where: { userId_nodeId: { userId, nodeId } },
      create: {
        userId,
        nodeId,
        status: "studied",
        knowledgeScore: 0.45,
        source: "study",
      },
      update:
        keepPassed && existing
          ? { source: existing.source }
          : { status: "studied", knowledgeScore: 0.45, source: "study" },
    });
  }

  private async scheduleFsrs(userId: string, questionId: string, correct: boolean) {
    const existing = await this.prisma.fsrsCard.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });
    const stored: StoredFsrsCard | null = existing
      ? {
          due: existing.due,
          stability: existing.stability,
          difficulty: existing.difficulty,
          elapsedDays: existing.elapsedDays,
          scheduledDays: existing.scheduledDays,
          learningSteps: existing.learningSteps,
          reps: existing.reps,
          lapses: existing.lapses,
          state: existing.state,
          lastReview: existing.lastReview,
        }
      : null;
    const next = reviewCard(stored, correct);
    await this.prisma.fsrsCard.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: {
        userId,
        questionId,
        due: next.due,
        stability: next.stability,
        difficulty: next.difficulty,
        elapsedDays: next.elapsedDays,
        scheduledDays: next.scheduledDays,
        learningSteps: next.learningSteps,
        reps: next.reps,
        lapses: next.lapses,
        state: next.state,
        lastReview: next.lastReview,
      },
      update: {
        due: next.due,
        stability: next.stability,
        difficulty: next.difficulty,
        elapsedDays: next.elapsedDays,
        scheduledDays: next.scheduledDays,
        learningSteps: next.learningSteps,
        reps: next.reps,
        lapses: next.lapses,
        state: next.state,
        lastReview: next.lastReview,
      },
    });
  }

  private labelFor(kind: string, title?: string) {
    switch (kind) {
      case "diagnosis_needed":
        return "Fazer o diagnóstico adaptativo";
      case "diagnosis_continue":
        return "Continuar o diagnóstico";
      case "study_continue":
        return `Continuar ${title}`;
      case "review_due":
        return `Rever ${title}`;
      case "study_module":
        return `Estudar ${title}`;
      case "lab_exercise":
        return `Praticar ${title} no lab`;
      case "project_build":
        return `Abrir projeto ${title}`;
      case "module_unpublished":
        return `${title} ainda não tem módulo`;
      case "path_complete":
        return "Abrir o mapa de competências";
      default:
        return "Ver mapa";
    }
  }

  async videosForNode(userId: string, nodeSlug: string) {
    const node = await this.prisma.knowledgeNode.findUnique({ where: { slug: nodeSlug } });
    if (!node) throw new NotFoundException("Nó não encontrado.");
    await assertNodeInUserScope(this.prisma, userId, node.id);

    let dbVideos = await this.prisma.studyVideo.findMany({
      where: { nodeId: node.id },
      orderBy: [{ language: "asc" }, { sortOrder: "asc" }],
    });

    const goal = node.goalId
      ? await this.prisma.goal.findUnique({
          where: { id: node.goalId },
          include: { targets: true },
        })
      : null;
    const primaryLabel = goal?.targets.find((t) => t.isPrimary)?.label;
    const topic =
      (primaryLabel && !isCustomGoalLabel(primaryLabel)
        ? primaryLabel
        : goal?.statement?.replace(/^quero (aprender|estudar)\s+/i, "")
      )?.slice(0, 80) || node.title;

    // Sempre repara línguas e preenche as que faltam (ex.: EN apagado por mismatch)
    await ensureVideosForNode(this.prisma, node.id, {
      title: node.title,
      topic,
    });
    dbVideos = await this.prisma.studyVideo.findMany({
      where: { nodeId: node.id },
      orderBy: [{ language: "asc" }, { sortOrder: "asc" }],
    });

    if (dbVideos.length > 0) {
      const capped = capVideosPerLanguage(dbVideos, 1).filter((item) =>
        hitMatchesLanguage(
          { title: item.title, channel: item.channel },
          item.language as VideoLang,
        ),
      );
      const langIds = [...new Set(capped.map((item) => item.language))];
      const videos = capped.map((item) => ({
        id: item.id,
        title: item.title,
        channel: item.channel,
        youtubeId: item.youtubeId,
        playlistId: item.playlistId ?? null,
        language: item.language,
        embedUrl: youtubeEmbedUrl(item.youtubeId, { playlistId: item.playlistId }),
        languageLabel:
          STUDY_VIDEO_LANGUAGES.find((lang) => lang.id === item.language)?.label ?? item.language,
        isPlaylist: Boolean(item.playlistId),
      }));
      return {
        node: { slug: node.slug, title: node.title },
        languages: STUDY_VIDEO_LANGUAGES.filter((lang) => langIds.includes(lang.id)),
        videos,
        policy:
          "Um vídeo por língua, alinhado a esta etapa. Se for de uma playlist, podes seguir a série completa.",
      };
    }

    // Seed Java / catálogo estático
    const languages = studyVideoLanguagesForNode(nodeSlug);
    const catalog = capVideosPerLanguage(
      studyVideosForNode(nodeSlug).map((item) => ({
        ...item,
        sortOrder: 0,
        playlistId: item.playlistId ?? null,
      })),
      1,
    );
    const videos = catalog.map((item) => ({
      ...item,
      playlistId: item.playlistId ?? null,
      embedUrl: youtubeEmbedUrl(item.youtubeId, { playlistId: item.playlistId }),
      languageLabel:
        STUDY_VIDEO_LANGUAGES.find((lang) => lang.id === item.language)?.label ?? item.language,
      isPlaylist: Boolean(item.playlistId),
    }));

    // Se nem o catálogo estático tem (nó gerado sem net): ainda tenta fallback genérico
    if (videos.length === 0) {
      await ensureVideosForNode(this.prisma, node.id, {
        title: node.title,
        topic: node.title,
      });
      const again = await this.prisma.studyVideo.findMany({
        where: { nodeId: node.id },
        orderBy: [{ language: "asc" }, { sortOrder: "asc" }],
      });
      const capped = capVideosPerLanguage(again, 1);
      const langIds = [...new Set(capped.map((item) => item.language))];
      return {
        node: { slug: node.slug, title: node.title },
        languages: STUDY_VIDEO_LANGUAGES.filter((lang) => langIds.includes(lang.id)),
        videos: capped.map((item) => ({
          id: item.id,
          title: item.title,
          channel: item.channel,
          youtubeId: item.youtubeId,
          playlistId: item.playlistId ?? null,
          language: item.language,
          embedUrl: youtubeEmbedUrl(item.youtubeId, { playlistId: item.playlistId }),
          languageLabel:
            STUDY_VIDEO_LANGUAGES.find((lang) => lang.id === item.language)?.label ?? item.language,
          isPlaylist: Boolean(item.playlistId),
        })),
        policy:
          "Um vídeo por língua. Se for playlist, podes ver a série completa ao dar play.",
      };
    }

    return {
      node: { slug: node.slug, title: node.title },
      languages: STUDY_VIDEO_LANGUAGES.filter((lang) => languages.includes(lang.id)),
      videos,
      policy:
        "Um vídeo por língua, alinhado a esta etapa. Playlist completa quando disponível.",
    };
  }

  async evolution(userId: string) {
    const weeks = 8;
    const now = new Date();
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (weeks - 1) * 7);

    const scope = await scopedNodeIds(this.prisma, userId);
    const nodeIds = scope?.nodeIds ?? [];
    const nodeFilter = nodeIds.length > 0 ? { nodeId: { in: nodeIds } } : { nodeId: "__none__" };

    const [sessions, masteryRows] = await Promise.all([
      this.prisma.studySession.findMany({
        where: {
          userId,
          status: "completed",
          completedAt: { gte: start },
          ...(nodeIds.length > 0 ? { nodeId: { in: nodeIds } } : { id: "__none__" }),
        },
        select: { completedAt: true, checkCorrect: true },
      }),
      this.prisma.nodeMastery.findMany({
        where: { userId, ...nodeFilter },
      }),
    ]);

    const buckets: Array<{
      weekStart: string;
      label: string;
      completed: number;
      correct: number;
    }> = [];

    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(start);
      weekStart.setUTCDate(start.getUTCDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 7);
      const inWeek = sessions.filter((row) => {
        if (!row.completedAt) return false;
        return row.completedAt >= weekStart && row.completedAt < weekEnd;
      });
      buckets.push({
        weekStart: weekStart.toISOString().slice(0, 10),
        label: weekStart.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }),
        completed: inWeek.length,
        correct: inWeek.filter((row) => row.checkCorrect).length,
      });
    }

    const studied = masteryRows.filter((row) =>
      ["studied", "passed"].includes(row.status),
    ).length;
    const totalNodes = nodeIds.length || 1;

    const ctx = await resolveCurriculumContext(this.prisma, userId);

    return {
      weeks: buckets,
      goal: ctx.available
        ? {
            id: ctx.goal.id,
            statement: ctx.goal.statement,
            primaryLabel: ctx.goal.targets.find((t) => t.isPrimary)?.label ?? null,
          }
        : null,
      summary: {
        modulesCompleted: sessions.length,
        nodesWithEvidence: studied,
        totalNodes,
        progressPct: Math.round((studied / totalNodes) * 100),
      },
    };
  }

  private messageFor(kind: string, title?: string) {
    switch (kind) {
      case "diagnosis_needed":
        return "O diagnóstico mede evidência pontual. Sem ele, o motor não escolhe um módulo.";
      case "diagnosis_continue":
        return "Há uma sessão de diagnóstico a meio. Termina-a antes de estudar.";
      case "study_continue":
        return `Continua o módulo de ${title}. A leitura sozinha não marca domínio.`;
      case "review_due":
        return `Há uma revisão FSRS vencida em ${title}. Retenção não é o mesmo que domínio prático.`;
      case "study_module":
        return `Estuda ${title}. Depois da verificação, o mapa regista «módulo verificado», não domínio de produção.`;
      case "lab_exercise":
        return `Pratica ${title} no laboratório. O código corre numa JVM Docker isolada; passar testes é evidência de habilidade.`;
      case "project_build":
        return `Constrói ${title}. Passar os testes isolados gera evidência no portfólio — não um certificado.`;
      case "module_unpublished":
        return `O próximo nó é ${title}, mas o módulo ainda não foi publicado. Sem aula inventada.`;
      case "path_complete":
        return "Os módulos e labs publicados deste caminho estão feitos. O portfólio mostra evidência de projeto, se existir — não é certificado. Spring ainda não tem aula.";
      default:
        return "Currículo indisponível para este alvo.";
    }
  }
}

/** Corpos antigos/meta — sem secções de pesquisa/aula. */
function isThinModuleBody(body: string): boolean {
  const text = body.trim();
  if (text.length < 400) return true;
  if (/Conteúdo gerado para o teu objectivo/i.test(text)) return true;
  if (/Define o vocabulário mínimo/i.test(text) && !/## O que a pesquisa diz/i.test(text) && !/## Conteúdo/i.test(text))
    return true;
  if (!/## /.test(text)) return true;
  // Módulos antigos sem método de estudo por estágio nem secção de documentos
  if (!/Como estudar este modo/i.test(text) && !/Onde encontrar documentos/i.test(text)) return true;
  return false;
}
