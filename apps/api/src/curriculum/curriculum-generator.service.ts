import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { GOAL_CATALOG, resolveDevCareer, resourceIsListable } from "@programeint/shared";
import { GOAL_SLUG_TO_NODE as SEEDED_TIP, RESOURCES, resourceMatchesContext } from "@programeint/database";
import { PrismaService } from "../prisma/prisma.service";
import { createAiProvider } from "../tutor/provider";
import {
  buildCareerLessonBody,
  buildLessonBody,
  buildTopicDiagnosis,
  heuristicCurriculumPlan,
  scopePrefixForGoal,
  slugifyKey,
  type CurriculumPlan,
  type CurriculumPlanNode,
} from "./curriculum-plan";
import { ensureVideosForNode } from "./ensure-node-videos";
import { searchWeb, wikiExtract, type WebHit } from "./web-search";
import { clearGoalGraph } from "./clear-goal-graph";

const STAGE_QUERY: Record<string, string> = {
  fundamentos: "fundamentals introduction overview",
  "conceitos-core": "core concepts explained",
  ferramentas: "setup tools environment install IDE package manager",
  "pratica-guiada": "exercises practice tutorial",
  "stack-framework": "framework ecosystem tutorial",
  "fullstack-complementos": "full stack complementary database docker frontend",
  padroes: "best practices patterns",
  "soft-skills": "software engineer soft skills code review meetings standup",
  "carreira-realidade": "day in the life software developer meetings",
  projecto: "project tutorial build portfolio",
  tip: "learning path career checklist",
};

function stageSearchQuery(
  nodeKey: string,
  topicLabel: string,
  career: ReturnType<typeof resolveDevCareer>,
): string {
  if (nodeKey === "stack-framework" && career?.researchHints.framework) {
    return `${topicLabel} ${career.researchHints.framework}`.slice(0, 100);
  }
  if (nodeKey === "fullstack-complementos" && career?.researchHints.fullstack) {
    return `${topicLabel} ${career.researchHints.fullstack}`.slice(0, 100);
  }
  if (nodeKey === "ferramentas" && career?.workTools.length) {
    const tools = career.workTools
      .slice(0, 3)
      .map((t) => t.name)
      .join(" ");
    return `${topicLabel} ${tools} setup`.slice(0, 100);
  }
  return `${topicLabel} ${STAGE_QUERY[nodeKey] ?? "basics"}`.slice(0, 100);
}

function dedupeHits(hits: WebHit[], limit: number): WebHit[] {
  const seen = new Set<string>();
  const out: WebHit[] = [];
  for (const hit of hits) {
    const key = (hit.url || hit.title).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
}

@Injectable()
export class CurriculumGeneratorService {
  private readonly logger = new Logger(CurriculumGeneratorService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  /** Garante tipNodeSlug no goal — seed Java ou geração para qualquer outro objectivo. */
  async ensureForGoal(goalId: string): Promise<void> {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
      include: { targets: true },
    });
    if (!goal || goal.status !== "active") return;

    const primary = goal.targets.find((t) => t.isPrimary);
    const primarySlug = primary?.slug ?? "custom";
    const seededTip = SEEDED_TIP[primarySlug];

    if (seededTip) {
      const node = await this.prisma.knowledgeNode.findUnique({ where: { slug: seededTip } });
      if (node) {
        await this.prisma.goal.update({
          where: { id: goalId },
          data: {
            tipNodeSlug: seededTip,
            curriculumStatus: "ready",
            curriculumSource: "seeded",
            curriculumScope: null,
            curriculumNote: "Currículo Java Backend publicado (seed de referência).",
          },
        });
        return;
      }
    }

    await this.prisma.goal.update({
      where: { id: goalId },
      data: { curriculumStatus: "generating", curriculumNote: "A pesquisar e gerar o mapa…" },
    });

    try {
      const prefs = await this.prisma.studyPreferences.findUnique({ where: { userId: goal.userId } });
      const label =
        primary?.label ??
        GOAL_CATALOG.find((item) => item.slug === primarySlug)?.label ??
        "Objectivo";

      const career = resolveDevCareer(primarySlug, goal.statement);
      const searchQuery = career
        ? `${label} ${career.coreFramework.name} full stack developer career learning path`
        : `${label} ${goal.statement} learning path fundamentals`;
      const [webHits, wikiGoal, pathHits, careerHits] = await Promise.all([
        searchWeb(searchQuery, 6),
        wikiExtract(`${label} ${goal.statement}`.slice(0, 80)),
        searchWeb(`${label} tutorial beginners documentation`, 4),
        career
          ? searchWeb(`${career.researchHints.dayInLife} ${career.researchHints.softSkills}`, 4)
          : Promise.resolve([] as WebHit[]),
      ]);
      const mergedHits = dedupeHits(
        [
          ...webHits,
          ...pathHits,
          ...careerHits,
          ...(wikiGoal
            ? [{ title: wikiGoal.title, snippet: wikiGoal.extract.slice(0, 280), url: wikiGoal.url }]
            : []),
        ],
        10,
      );
      const snippets = mergedHits.map((hit) => `${hit.title}: ${hit.snippet}`);

      let plan = heuristicCurriculumPlan({
        statement: goal.statement,
        primaryLabel: label,
        primarySlug,
        experienceLevel: prefs?.experienceLevel ?? "beginner",
        searchSnippets: snippets,
        searchHits: mergedHits,
      });

      plan = await this.enrichPlanWithAi(plan, {
        statement: goal.statement,
        label,
        experienceLevel: prefs?.experienceLevel ?? "beginner",
        snippets,
        career,
      });

      // Pesquisa por nó → corpo (falhas de rede não derrubam o mapa)
      plan = await this.prepareModulesFromResearch(plan, {
        statement: goal.statement,
        experienceLevel: prefs?.experienceLevel ?? "beginner",
        goalSlug: primarySlug,
      });

      // Chaves únicas (IA pode repetir keys)
      plan = dedupePlanKeys(plan);

      await this.persistPlan(goalId, plan, {
        withVideos: prefs?.prefersVideo !== false,
        goalSlug: primarySlug,
        statement: goal.statement,
        topicLabel: plan.topicLabel,
      });
      await this.prisma.goal.update({
        where: { id: goalId },
        data: {
          curriculumStatus: "ready",
          curriculumSource: "generated",
          curriculumNote: plan.searchSummary?.slice(0, 280) || `Mapa gerado para «${label}».`,
          tipNodeSlug: `${scopePrefixForGoal(goalId)}${slugifyKey(plan.tipKey)}`,
          curriculumScope: scopePrefixForGoal(goalId),
        },
      });
    } catch (error) {
      this.logger.error(`Falha a gerar currículo para ${goalId}`, error as Error);
      await this.prisma.goal.update({
        where: { id: goalId },
        data: {
          curriculumStatus: "failed",
          curriculumNote: (error as Error).message?.slice(0, 280) || "Falha na geração.",
        },
      });
    }
  }

  /** Volta a gerar o mapa de um objectivo (ex.: após falha). */
  async regenerateForGoal(goalId: string): Promise<void> {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.status !== "active") return;
    await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        tipNodeSlug: null,
        curriculumStatus: "generating",
        curriculumNote: "A regenerar o mapa de estudo…",
        curriculumSource: null,
        curriculumScope: null,
      },
    });
    await clearGoalGraph(this.prisma, goalId);
    await this.ensureForGoal(goalId);
  }

  private async enrichPlanWithAi(
    base: CurriculumPlan,
    ctx: {
      statement: string;
      label: string;
      experienceLevel: string;
      snippets: string[];
      career?: ReturnType<typeof resolveDevCareer>;
    },
  ): Promise<CurriculumPlan> {
    const provider = createAiProvider({
      apiKey: this.config.get<string>("AI_API_KEY"),
      baseUrl: this.config.get<string>("AI_BASE_URL"),
      model: this.config.get<string>("AI_MODEL"),
      timeoutMs: 45_000,
    });
    if (!provider) return base;

    const careerBlock = ctx.career
      ? [
          `Carreira: ${ctx.career.roleTitle}`,
          `Framework: ${ctx.career.coreFramework.name}`,
          `Complementares: ${ctx.career.complementary.map((c) => c.name).join(", ")}`,
          `Inclui nós de soft skills, reuniões/dia-a-dia e full-stack — não só sintaxe.`,
        ].join("\n")
      : "Se for programação, inclui stack complementar e soft skills do trabalho real.";

    const prompt = [
      "Gera um mapa de estudo JSON para a plataforma Programeint.",
      "Responde APENAS com JSON válido (sem markdown) neste formato:",
      JSON.stringify({
        tipKey: "tip",
        topicLabel: "string",
        searchSummary: "string curto",
        nodes: [
          {
            key: "slug-curto",
            title: "string",
            summary: "string",
            area: "base|pratica|integracao|objetivo",
            body: "markdown completo do módulo (mín. 4 secções: contexto, conceitos, exemplo, mini-desafio)",
            checkPrompt: "pergunta de verificação sobre o conceito do nó",
            checkChoices: [
              { id: "a", text: "..." },
              { id: "b", text: "..." },
              { id: "c", text: "..." },
              { id: "d", text: "..." },
            ],
            correctChoiceId: "a",
            checkExplanation: "string",
            videoQueries: { pt: "...", en: "...", es: "..." },
          },
        ],
        edges: [{ nodeKey: "x", prereqKey: "y", nature: "required" }],
      }),
      "",
      `Objectivo do aluno: ${ctx.statement}`,
      `Área / rótulo: ${ctx.label}`,
      `Nível: ${ctx.experienceLevel}`,
      careerBlock,
      `Pesquisa web: ${ctx.snippets.join(" | ") || "(sem resultados)"}`,
      "",
      ctx.career
        ? "Regras: 9 a 12 nós; inclui stack-framework, fullstack-complementos, soft-skills, carreira-realidade; tip final;"
        : "Regras: 6 a 10 nós; um tip final;",
      "arestas required formam caminho acíclico;",
      "cada body é uma AULA real (não meta-estudo): usa a pesquisa, conceitos, exemplo e desafio;",
      "para soft-skills e carreira: reuniões, PRs, dia-a-dia — não inventes salários;",
      "checkPrompt testa o conceito do nó; português claro; sem inventar URLs.",
    ].join("\n");

    try {
      const completion = await provider.complete([
        {
          role: "system",
          content:
            "És um designer de currículos de carreira em software. Produzes apenas JSON válido. Não inventas factos duvidosos.",
        },
        { role: "user", content: prompt },
      ]);
      const jsonText = extractJson(completion.content);
      const parsed = JSON.parse(jsonText) as CurriculumPlan;
      if (!parsed.nodes?.length || !parsed.tipKey) return base;
      return {
        tipKey: parsed.tipKey,
        topicLabel: parsed.topicLabel || base.topicLabel,
        searchSummary: parsed.searchSummary || base.searchSummary,
        nodes: parsed.nodes.map((node) => normalizeNode(node, base.topicLabel)),
        edges: (parsed.edges ?? base.edges).filter(
          (edge) => edge.nodeKey && edge.prereqKey && edge.nodeKey !== edge.prereqKey,
        ),
      };
    } catch (error) {
      this.logger.warn(`IA indisponível — uso plano heurístico: ${(error as Error).message}`);
      return base;
    }
  }

  /** Pesquisa por nó (várias queries) e monta corpo completo: conteúdo + como estudar + docs. */
  private async prepareModulesFromResearch(
    plan: CurriculumPlan,
    ctx: { statement: string; experienceLevel: string; goalSlug?: string },
  ): Promise<CurriculumPlan> {
    const levelNote =
      ctx.experienceLevel === "none" || ctx.experienceLevel === "beginner"
        ? "Nível: iniciante — vocabulário, ideias centrais e primeiro exercício guiado."
        : ctx.experienceLevel === "intermediate"
          ? "Nível: intermédio — aprofunda conceitos e prática com critérios de qualidade."
          : "Nível: avançado — padrões, trade-offs e projecto integrador.";

    const career = resolveDevCareer(ctx.goalSlug, ctx.statement);
    const careerBodyKeys = new Set([
      "stack-framework",
      "fullstack-complementos",
      "soft-skills",
      "carreira-realidade",
      "ferramentas",
      "tip",
    ]);

    const nodes: CurriculumPlanNode[] = [];
    for (const node of plan.nodes) {
      try {
        const q1 = `${plan.topicLabel} ${node.title}`.slice(0, 100);
        const q2 = stageSearchQuery(node.key, plan.topicLabel, career);
        const [wiki, hitsA, hitsB] = await Promise.all([
          wikiExtract(q1).catch(() => null),
          searchWeb(q1, 4).catch(() => [] as WebHit[]),
          searchWeb(q2, 3).catch(() => [] as WebHit[]),
        ]);
        const hits = dedupeHits([...hitsA, ...hitsB], 6);
        const haystack = `${ctx.statement} ${plan.topicLabel} ${node.title} ${node.summary}`.toLowerCase();
        const documents = RESOURCES.filter((item) =>
          resourceMatchesContext(item, {
            goalSlug: ctx.goalSlug,
            nodeKey: node.key,
            haystack,
          }),
        )
          .filter((item) => resourceIsListable(item))
          .slice(0, 6)
          .map((item) => ({
            title: item.title,
            url: item.url,
            publisher: item.publisher,
            license: item.license,
          }));

        if (wiki?.url?.startsWith("https://")) {
          documents.unshift({
            title: wiki.title || `Wikipedia — ${node.title}`,
            url: wiki.url,
            publisher: "Wikipedia",
            license: "CC-BY-SA-4.0",
          });
        }
        for (const hit of hits) {
          if (!hit.url?.startsWith("https://")) continue;
          if (documents.some((d) => d.url === hit.url)) continue;
          // Biblioteca: só Wikipedia CC-BY-SA (política de licenças). Outros hits ficam no corpo da aula.
          if (!/wikipedia\.org/i.test(hit.url)) continue;
          documents.push({
            title: hit.title.slice(0, 120),
            url: hit.url,
            publisher: "Wikipedia",
            license: "CC-BY-SA-4.0",
          });
        }

        const diagnosis = buildTopicDiagnosis({
          title: node.title,
          topic: plan.topicLabel,
          key: node.key,
          statement: ctx.statement,
          factHint: wiki?.extract ?? hits[0]?.snippet,
        });
        const hitList = hits.length > 0 ? hits : [{ title: node.title, snippet: node.summary }];
        const templated =
          career && careerBodyKeys.has(node.key)
            ? buildCareerLessonBody({
                title: node.title,
                key: node.key,
                topic: plan.topicLabel,
                statement: ctx.statement,
                levelNote,
                career,
                hits: hitList,
              })
            : buildLessonBody({
                title: node.title,
                key: node.key,
                topic: plan.topicLabel,
                statement: ctx.statement,
                levelNote,
                wiki,
                hits: hitList,
                documents,
              });
        // Preferir corpo da IA se já for aula rica; só acrescenta pesquisa em falta
        const body = isRichLessonBody(node.body)
          ? mergeResearchIntoBody(node.body, wiki, hitList, documents)
          : templated;
        nodes.push({
          ...node,
          ...diagnosis,
          documents: documents.slice(0, 8),
          body,
          videoQueries: {
            pt: node.videoQueries?.pt || `${plan.topicLabel} ${node.title} tutorial português`,
            en: node.videoQueries?.en || `${plan.topicLabel} ${node.title} tutorial`,
            es: node.videoQueries?.es || `${plan.topicLabel} ${node.title} tutorial español`,
          },
        });
      } catch (error) {
        this.logger.warn(
          `Pesquisa falhou para nó ${node.key}: ${(error as Error).message} — uso corpo mínimo.`,
        );
        const diagnosis = buildTopicDiagnosis({
          title: node.title,
          topic: plan.topicLabel,
          key: node.key,
          statement: ctx.statement,
        });
        const hitList = [{ title: node.title, snippet: node.summary }];
        nodes.push({
          ...node,
          ...diagnosis,
          body:
            career && careerBodyKeys.has(node.key)
              ? buildCareerLessonBody({
                  title: node.title,
                  key: node.key,
                  topic: plan.topicLabel,
                  statement: ctx.statement,
                  levelNote,
                  career,
                  hits: hitList,
                })
              : buildLessonBody({
                  title: node.title,
                  key: node.key,
                  topic: plan.topicLabel,
                  statement: ctx.statement,
                  levelNote,
                  wiki: null,
                  hits: hitList,
                }),
        });
      }
    }
    return { ...plan, nodes };
  }

  private async persistPlan(
    goalId: string,
    plan: CurriculumPlan,
    opts: {
      withVideos: boolean;
      goalSlug: string;
      statement: string;
      topicLabel: string;
    },
  ) {
    const scope = scopePrefixForGoal(goalId);

    // Limpa grafo antigo sem rebentar FKs Restrict (diagnóstico / estudo)
    await clearGoalGraph(this.prisma, goalId);

    const idByKey = new Map<string, string>();
    const haystack = `${opts.statement} ${opts.topicLabel} ${opts.goalSlug}`.toLowerCase();

    for (let i = 0; i < plan.nodes.length; i += 1) {
      const node = plan.nodes[i];
      if (!node) continue;
      const slug = `${scope}${slugifyKey(node.key)}`;
      const created = await this.prisma.knowledgeNode.create({
        data: {
          slug,
          title: node.title.slice(0, 120),
          summary: node.summary.slice(0, 280),
          area: node.area.slice(0, 64),
          sortOrder: i + 1,
          goalId,
        },
      });
      idByKey.set(node.key, created.id);

      const checkSlug = `${slug}-check`;
      const question = await this.prisma.question.create({
        data: {
          slug: checkSlug,
          nodeId: created.id,
          prompt: node.checkPrompt,
          code: null,
          choices: node.checkChoices,
          correctChoiceId: node.correctChoiceId,
          explanation: node.checkExplanation,
          kind: "check",
        },
      });

      await this.prisma.question.create({
        data: {
          slug: `${slug}-diag`,
          nodeId: created.id,
          prompt: node.checkPrompt,
          code: null,
          choices: node.checkChoices,
          correctChoiceId: node.correctChoiceId,
          explanation: node.checkExplanation,
          kind: "diagnosis",
        },
      });

      await this.prisma.learningModule.create({
        data: {
          nodeId: created.id,
          slug,
          title: node.title.slice(0, 120),
          summary: node.summary.slice(0, 280),
          body: node.body,
          checkQuestionId: question.id,
          published: true,
        },
      });

      try {
        await this.attachLibrary(created.id, {
          goalSlug: opts.goalSlug,
          nodeKey: node.key,
          haystack: `${haystack} ${node.title} ${node.summary}`,
        });
        await this.attachNodeDocuments(created.id, node.documents ?? []);
      } catch (error) {
        this.logger.warn(`Biblioteca falhou em ${slug}: ${(error as Error).message}`);
      }

      if (opts.withVideos !== false) {
        try {
          await this.attachVideos(created.id, node, opts.topicLabel);
        } catch (error) {
          this.logger.warn(`Vídeos falharam em ${slug}: ${(error as Error).message}`);
        }
      }

      if (
        node.key === "pratica-guiada" ||
        node.key === "projecto" ||
        node.key === "conceitos-core" ||
        node.key === "padroes"
      ) {
        try {
          await this.attachGuidedLab(created.id, slug, node, opts);
        } catch (error) {
          this.logger.warn(`Lab guiado falhou em ${slug}: ${(error as Error).message}`);
        }
      }
    }

    for (const edge of plan.edges) {
      const nodeId = idByKey.get(edge.nodeKey);
      const prerequisiteId = idByKey.get(edge.prereqKey);
      if (!nodeId || !prerequisiteId) continue;
      await this.prisma.nodePrerequisite.create({
        data: {
          nodeId,
          prerequisiteId,
          nature: edge.nature === "recommended" ? "recommended" : "required",
        },
      });
    }
  }

  /** Liga recursos curados (licença conhecida) aos nós gerados do objectivo. */
  private async attachLibrary(
    nodeId: string,
    ctx: { goalSlug: string; nodeKey: string; haystack: string },
  ) {
    const matches = RESOURCES.filter((item) =>
      resourceMatchesContext(item, {
        goalSlug: ctx.goalSlug,
        nodeKey: ctx.nodeKey,
        haystack: ctx.haystack,
      }),
    );
    if (matches.length === 0) return;

    for (const item of matches) {
      if (!resourceIsListable(item)) continue;
      const resource = await this.prisma.learningResource.upsert({
        where: { slug: item.slug },
        create: {
          slug: item.slug,
          title: item.title,
          url: item.url,
          publisher: item.publisher,
          kind: item.kind,
          license: item.license,
          language: item.language,
          summary: item.summary,
          official: item.official,
          published: true,
        },
        update: {
          title: item.title,
          url: item.url,
          published: true,
        },
      });
      await this.prisma.resourceNode.upsert({
        where: { resourceId_nodeId: { resourceId: resource.id, nodeId } },
        create: { resourceId: resource.id, nodeId },
        update: {},
      });
    }
  }

  /** Liga Wikipedia / docs do plano ao nó (licença conhecida). */
  private async attachNodeDocuments(
    nodeId: string,
    documents: Array<{ title: string; url: string; publisher?: string; license?: string }>,
  ) {
    for (const item of documents) {
      const license = item.license || "CC-BY-SA-4.0";
      const candidate = {
        title: item.title,
        url: item.url,
        license,
        kind: "article" as const,
        official: true,
      };
      if (!resourceIsListable(candidate)) continue;
      const slug = `src-${createHash("sha1").update(item.url).digest("hex").slice(0, 12)}`;
      const resource = await this.prisma.learningResource.upsert({
        where: { slug },
        create: {
          slug,
          title: item.title.slice(0, 180),
          url: item.url,
          publisher: (item.publisher || "Fonte").slice(0, 120),
          kind: "article",
          license,
          language: "en",
          summary: `Fonte da pesquisa do mapa: ${item.title}`.slice(0, 280),
          official: true,
          published: true,
        },
        update: { title: item.title.slice(0, 180), url: item.url, published: true },
      });
      await this.prisma.resourceNode.upsert({
        where: { resourceId_nodeId: { resourceId: resource.id, nodeId } },
        create: { resourceId: resource.id, nodeId },
        update: {},
      });
    }
  }

  private async attachVideos(nodeId: string, node: CurriculumPlanNode, topicLabel: string) {
    await ensureVideosForNode(this.prisma, nodeId, {
      title: node.title,
      topic: topicLabel,
      queries: node.videoQueries,
    });
  }

  /** Prática / problemas / projecto com evidência (sem Docker). */
  private async attachGuidedLab(
    nodeId: string,
    nodeSlug: string,
    node: CurriculumPlanNode,
    opts: { statement: string; topicLabel: string },
  ) {
    const kind =
      node.key === "projecto"
        ? "project"
        : node.key === "pratica-guiada"
          ? "practice"
          : "problem";
    const fileName =
      kind === "project" ? "project.md" : kind === "practice" ? "practice.md" : "problema.md";
    const labSlug = `${nodeSlug}-lab`;
    const starter =
      kind === "project"
        ? `# Projecto — ${node.title}

Objectivo: ${opts.statement}

## Problema a resolver
- Qual o problema concreto do utilizador / sistema?

## Artefacto
- O que construíste / entregaste:
- Como se usa (passos):

## Critérios pass / fail
- Passa se:
- Falha se:

## Aprendizagem
- 2 coisas que aprendeste neste objectivo:
`
        : kind === "practice"
          ? `# Prática — ${node.title}

Objectivo: ${opts.statement}
Tema: ${opts.topicLabel}

## Problema 1
- Enunciado (o que tinhas de fazer):
- A tua solução (passos ou código):
- Resultado (passou / falhou e porquê):

## Problema 2
- Enunciado:
- Solução:
- Resultado:

## Reflexão
- O que falhou e como corrigiste:
- Como isto liga a «${opts.statement}»:
`
          : `# Resolver problemas — ${node.title}

Objectivo: ${opts.statement}
Tema: ${opts.topicLabel}

## Problema
Descreve UM problema realista ligado a «${opts.topicLabel}» no contexto do teu objectivo.

- Enunciado:
- Entrada / situação:
- Saída / resultado esperado:

## A tua abordagem
- Passos que seguiste:
- Alternativas que rejeitaste e porquê:

## Solução
- Resposta / código / decisão:
- Como validaste (teste mental ou exemplo):

## Critério
- Passa se:
- Ainda incompleto se:
`;

    const title =
      kind === "project"
        ? `Projecto: ${node.title}`.slice(0, 120)
        : kind === "practice"
          ? `Prática: ${node.title}`.slice(0, 120)
          : `Problemas: ${node.title}`.slice(0, 120);

    const prompt =
      kind === "project"
        ? `Resolve o projecto mínimo alinhado a «${opts.statement}»: problema → artefacto → critérios pass/fail.`
        : kind === "practice"
          ? `Resolve 2 problemas práticos de «${node.title}» com evidência (solução + resultado). Sem placeholders.`
          : `Formula e resolve um problema de «${opts.topicLabel}» ligado a «${opts.statement}». Mostra abordagem + validação.`;

    await this.prisma.labExercise.upsert({
      where: { slug: labSlug },
      create: {
        nodeId,
        slug: labSlug,
        title,
        prompt,
        language: "guided",
        entryClass: "Evidence",
        starterFiles: [{ path: fileName, content: starter }],
        hiddenFiles: [],
        published: true,
        timeoutMs: 5_000,
      },
      update: {
        nodeId,
        title,
        prompt,
        language: "guided",
        starterFiles: [{ path: fileName, content: starter }],
        published: true,
      },
    });
  }
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

function isRichLessonBody(body: string | undefined): boolean {
  if (!body || body.trim().length < 400) return false;
  const headings = body.match(/^##\s+/gm) ?? [];
  return headings.length >= 2;
}

function mergeResearchIntoBody(
  aiBody: string,
  wiki: { title: string; extract: string; url?: string; imageUrl?: string } | null | undefined,
  hits: WebHit[],
  documents: Array<{ title: string; url: string; publisher?: string }>,
): string {
  const parts = [aiBody.trim()];
  const blob = aiBody.toLowerCase();

  const cover = wiki?.imageUrl || hits.find((h) => h.imageUrl)?.imageUrl;
  if (cover && !/!\[[^\]]*\]\(https?:\/\//i.test(aiBody)) {
    parts.unshift(`![${wiki?.title || "Ilustração"}](${cover})`, "");
  }

  if (wiki?.extract && !blob.includes(wiki.extract.slice(0, 48).toLowerCase())) {
    parts.push("", "## Fontes da pesquisa", "", wiki.extract);
    if (wiki.url) parts.push("", `Fonte: [${wiki.title}](${wiki.url})`);
  }

  const extraHits = hits.filter((h) => h.snippet && !blob.includes(h.snippet.slice(0, 40).toLowerCase()));
  if (extraHits.length > 0 && !/^##\s+Pontos da pesquisa/m.test(aiBody)) {
    parts.push("", "### Pontos da pesquisa", "");
    for (const hit of extraHits.slice(0, 4)) {
      const link = hit.url ? ` — [abrir](${hit.url})` : "";
      parts.push(`- **${hit.title}** — ${hit.snippet}${link}`);
    }
  }

  if (documents.length > 0 && !blob.includes("onde encontrar documentos")) {
    parts.push("", "## Onde encontrar documentos", "");
    for (const doc of documents.slice(0, 5)) {
      const pub = doc.publisher ? ` (${doc.publisher})` : "";
      parts.push(`- [${doc.title}](${doc.url})${pub}`);
    }
  }

  return parts.join("\n");
}

function normalizeNode(node: CurriculumPlanNode, fallbackTopic: string): CurriculumPlanNode {
  const ids = ["a", "b", "c", "d"] as const;
  const choices: Array<{ id: string; text: string }> =
    Array.isArray(node.checkChoices) && node.checkChoices.length >= 2
      ? node.checkChoices.slice(0, 4).map((choice, index) => ({
          id: String(choice.id || ids[index] || `o${index}`),
          text: String(choice.text || `Opção ${index + 1}`),
        }))
      : [
          { id: "a", text: "Praticar e demonstrar com evidência" },
          { id: "b", text: "Saltar sem praticar" },
          { id: "c", text: "Ignorar fundamentos" },
          { id: "d", text: "Só ver vídeos" },
        ];
  const correct =
    choices.find((c) => c.id === node.correctChoiceId)?.id ?? choices[0]?.id ?? "a";
  return {
    key: slugifyKey(node.key || node.title || `n-${Math.random().toString(16).slice(2)}`),
    title: String(node.title || fallbackTopic).slice(0, 120),
    summary: String(node.summary || node.title || "").slice(0, 280),
    area: String(node.area || "base").slice(0, 64),
    body: String(node.body || `# ${node.title}\n\nConteúdo gerado para o teu objectivo.`),
    checkPrompt: String(node.checkPrompt || `O que é essencial em ${node.title}?`),
    checkChoices: choices,
    correctChoiceId: correct,
    checkExplanation: String(node.checkExplanation || "A opção correcta privilegia evidência."),
    videoQueries: {
      pt: node.videoQueries?.pt || `${node.title} tutorial português`,
      en: node.videoQueries?.en || `${node.title} tutorial`,
      es: node.videoQueries?.es || `${node.title} tutorial español`,
    },
  };
}

function dedupePlanKeys(plan: CurriculumPlan): CurriculumPlan {
  const seen = new Set<string>();
  const keyMap = new Map<string, string>();
  const nodes = plan.nodes.map((node, index) => {
    let key = slugifyKey(node.key || `n-${index}`);
    if (seen.has(key)) {
      key = slugifyKey(`${key}-${index}`);
    }
    seen.add(key);
    keyMap.set(node.key, key);
    return { ...node, key };
  });
  const tipKey = keyMap.get(plan.tipKey) ?? nodes[nodes.length - 1]?.key ?? plan.tipKey;
  const edges = plan.edges.map((edge) => ({
    ...edge,
    nodeKey: keyMap.get(edge.nodeKey) ?? edge.nodeKey,
    prereqKey: keyMap.get(edge.prereqKey) ?? edge.prereqKey,
  }));
  return { ...plan, tipKey, nodes, edges };
}
