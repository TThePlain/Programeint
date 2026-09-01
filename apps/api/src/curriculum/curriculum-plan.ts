import { createHash } from "node:crypto";
import {
  DEV_CAREER_STAGES,
  isCustomGoalLabel,
  resolveDevCareer,
  type DevCareerProfile,
} from "@programeint/shared";
import type { WebHit } from "./web-search";

export type CurriculumPlanNode = {
  key: string;
  title: string;
  summary: string;
  area: string;
  body: string;
  checkPrompt: string;
  checkChoices: Array<{ id: string; text: string }>;
  correctChoiceId: string;
  checkExplanation: string;
  videoQueries: { pt: string; en: string; es: string };
  documents?: Array<{ title: string; url: string; publisher?: string; license?: string }>;
};

export type CurriculumPlanEdge = {
  nodeKey: string;
  prereqKey: string;
  nature: "required" | "recommended";
};

export type CurriculumPlan = {
  tipKey: string;
  topicLabel: string;
  searchSummary: string;
  nodes: CurriculumPlanNode[];
  edges: CurriculumPlanEdge[];
};

export function scopePrefixForGoal(goalId: string): string {
  const short = createHash("sha1").update(goalId).digest("hex").slice(0, 8);
  return `g-${short}-`;
}

export function slugifyKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "topico";
}

const STAGE_FOCUS: Record<string, string> = {
  fundamentos:
    "Vocabulário mínimo, o problema que este objectivo resolve, e como vais medir o primeiro progresso.",
  "conceitos-core":
    "Ideias centrais que tens de explicar sem copiar: o quê, porquê, e um exemplo concreto.",
  ferramentas:
    "Materiais, ferramentas ou ambiente mínimo para praticar — evidência de que consegues começar.",
  "pratica-guiada":
    "Exercícios curtos com critério de aceitação. Falha visível > «acho que está bem».",
  padroes: "Padrões comuns, erros típicos e trade-offs com prós/contras neste objectivo.",
  projecto:
    "Artefacto mínimo alinhado ao objectivo (trabalho, demo, relatório, apresentação). Evidência > intenção.",
  tip: "Revisa falhas, completa nós em atraso e reforça com vídeos/biblioteca — domínio = evidência.",
  "stack-framework":
    "Framework e ecossistema da carreira (ex. Spring Boot): o que é, para que serve, primeiro serviço mínimo.",
  "fullstack-complementos":
    "Peças complementares para perfil full-stack / empregável: dados, API, UI e entrega — sem misturar outro objectivo.",
  "soft-skills":
    "Como trabalhar em equipa nesta área: reuniões, PRs, comunicação e trade-offs — não só código.",
  "carreira-realidade":
    "Como é ser profissional nesta carreira: dia-a-dia, tempo a programar vs reunir, manutenção e crescimento.",
};

/** Como estudar ESTE estágio (metodologia de programação / tech). */
const STAGE_HOWTO: Record<string, (topic: string, statement: string) => string[]> = {
  fundamentos: (topic, statement) => [
    `Lê o texto e o vídeo e anota 5 termos de «${topic}» com a tua definição (1 linha cada).`,
    `Escreve em 3 frases: que problema «${topic}» resolve no teu objectivo («${statement}»).`,
    `Fecha com a verificação — se errares, volta só ao vocabulário, não ao mapa inteiro.`,
  ],
  "conceitos-core": (topic, statement) => [
    `Explica em voz alta (ou por escrito) o conceito central de «${topic}» sem olhar para o texto.`,
    `Inventa um exemplo teu ligado a «${statement}» — não copies o exemplo da pesquisa.`,
    `Compara com o vídeo: o que clarificou que o texto não? Anota 1 insight.`,
  ],
  ferramentas: (topic) => [
    `Prepara o mínimo para praticar «${topic}» (app, livro, instrumento, ambiente, conta…).`,
    `Faz um primeiro exercício verificável (passa/falha à vista) — isso é evidência de setup.`,
    `Se o vídeo mostrar passos, repete-os tu; não marques o nó só por ter visto o vídeo.`,
  ],
  "pratica-guiada": (topic, statement) => [
    `Faz 1–3 exercícios curtos de «${topic}» com critério claro (certo / incompleto).`,
    `Cada falha: corrige e re-tenta antes de avançar no mapa.`,
    `Liga pelo menos um exercício ao teu objectivo: «${statement}».`,
  ],
  padroes: (topic) => [
    `Lista 2 boas práticas e 1 erro típico de «${topic}» com um trade-off cada.`,
    `No vídeo ou texto, identifica quando alguém escolhe um método — e porquê.`,
    `Escreve: «No meu objectivo, eu usaria X porque…».`,
  ],
  projecto: (_topic, statement) => [
    `Define o artefacto mínimo alinhado a: «${statement}».`,
    `Entrega algo que outra pessoa consiga ver ou avaliar em poucos minutos.`,
    `A verificação confirma que o trabalho fala deste objectivo — não de outra matéria.`,
  ],
  tip: (topic, statement) => [
    `Reabre nós falhados ou «sem evidência» neste mapa de «${topic}».`,
    `Usa a biblioteca e os vídeos só para fechar buracos do teu objectivo («${statement}»).`,
    `Marca progresso só com verificação — o fecho não substitui estudar.`,
  ],
  "stack-framework": (topic, statement) => [
    `Nomeia o framework/ecossistema central de «${topic}» e o problema que resolve no objectivo «${statement}».`,
    `Sobe um exemplo mínimo (API «olá», rota, ou app vazia) — evidência > tutorial só visto.`,
    `Anota 3 conceitos do framework que vais reutilizar no projecto.`,
  ],
  "fullstack-complementos": (topic, statement) => [
    `Lista as camadas full-stack do teu perfil (backend, dados, UI, entrega) ligadas a «${statement}».`,
    `Escolhe 1 complemento (SQL, Docker, frontend…) e faz um exercício verificável.`,
    `Escreve: «Sem X, o meu perfil de «${topic}» fica incompleto porque…».`,
  ],
  "soft-skills": (_topic, statement) => [
    `Abre o **Simulador de trabalho** (/simulador) e faz a daily de 60s sobre «${statement}».`,
    `No simulador, clarifica o ticket vago e escreve critérios pass/fail.`,
    `Completa o ritual de PR + review — evidência conta para soft skills deste objectivo.`,
  ],
  "carreira-realidade": (topic, statement) => [
    `Descreve um dia típico nesta carreira (não só «programar 8 h») alinhado a «${statement}».`,
    `Usa o simulador: daily + ticket + PR são o trabalho real de «${topic}».`,
    `Responde: «Quero esta carreira porque… e aceito que o trabalho inclui reuniões e reviews».`,
  ],
};

/** Monta o corpo do módulo: pesquisa real + como estudar este nó + onde achar docs. */
export function buildLessonBody(input: {
  title: string;
  key: string;
  topic: string;
  statement: string;
  levelNote: string;
  wiki?: { title: string; extract: string; url?: string; imageUrl?: string } | null;
  hits: WebHit[];
  documents?: Array<{ title: string; url: string; publisher?: string }>;
}): string {
  const focus = STAGE_FOCUS[input.key] ?? STAGE_FOCUS.fundamentos;
  const howto =
    STAGE_HOWTO[input.key]?.(input.topic, input.statement) ??
    STAGE_HOWTO.fundamentos!(input.topic, input.statement);

  const lines: string[] = [
    `# ${input.title}`,
    "",
    `**O teu objectivo:** ${input.statement}`,
    "",
    `**Este nó do mapa:** ${focus}`,
    "",
    input.levelNote,
    "",
    "## Conteúdo (pesquisa sobre o teu objectivo)",
    "",
  ];

  const coverImage =
    input.wiki?.imageUrl ||
    input.hits.find((h) => h.imageUrl)?.imageUrl;
  if (coverImage) {
    lines.push(`![${input.wiki?.title || input.topic}](${coverImage})`);
    lines.push("");
  }

  if (input.wiki?.extract) {
    lines.push(input.wiki.extract);
    if (input.wiki.url) {
      lines.push("");
      lines.push(`Fonte principal: [${input.wiki.title}](${input.wiki.url})`);
    }
    lines.push("");
  } else {
    lines.push(
      `Ainda a consolidar fontes para «${input.topic}». Usa os pontos abaixo e a biblioteca do objectivo.`,
    );
    lines.push("");
  }

  if (input.hits.length > 0) {
    lines.push("### Pontos da pesquisa");
    lines.push("");
    for (const hit of input.hits.slice(0, 6)) {
      const link = hit.url ? ` — [abrir](${hit.url})` : "";
      lines.push(`- **${hit.title}** — ${hit.snippet}${link}`);
    }
    lines.push("");
  }

  lines.push("## Como estudar este modo do mapa");
  lines.push("");
  lines.push(
    `Neste estágio (**${input.key}**) do mapa de «${input.topic}», segue este método (não é genérico — é para o teu objectivo):`,
  );
  lines.push("");
  howto.forEach((step, i) => {
    lines.push(`${i + 1}. ${step}`);
  });
  lines.push("");
  lines.push(
    `**Exemplo:** se o teu objectivo é «${input.statement}», neste nó «${input.title}» o sucesso é conseguires explicar ou demonstrar algo concreto de «${input.topic}» — não só marcar o módulo como lido.`,
  );
  lines.push("");

  lines.push("## Onde encontrar documentos");
  lines.push("");
  if (input.documents && input.documents.length > 0) {
    lines.push("Recursos oficiais / curados ligados a este nó (abrem no site do editor):");
    lines.push("");
    for (const doc of input.documents.slice(0, 8)) {
      const pub = doc.publisher ? ` (${doc.publisher})` : "";
      lines.push(`- [${doc.title}](${doc.url})${pub}`);
    }
    lines.push("");
  }
  const researchLinks = input.hits.filter((h) => h.url).slice(0, 5);
  if (researchLinks.length > 0) {
    lines.push("Links da pesquisa web sobre o objectivo:");
    lines.push("");
    for (const hit of researchLinks) {
      lines.push(`- [${hit.title}](${hit.url})`);
    }
    lines.push("");
  }
  if ((!input.documents || input.documents.length === 0) && researchLinks.length === 0) {
    lines.push(
      `- Abre a **Biblioteca do objectivo** na app (filtrada por este mapa).`,
    );
    lines.push(
      `- Documentação oficial: pesquisa «${input.topic} official docs» ou o site do projecto.`,
    );
    lines.push(
      `- Wikipedia / artigos introdutórios: usa só como mapa mental, depois confirma na fonte oficial.`,
    );
    lines.push("");
  }
  lines.push(
    `Também podes filtrar a biblioteca pelo nó «${input.title}» — só recursos deste objectivo.`,
  );
  lines.push("");

  lines.push("## Mini-desafio (evidência)");
  lines.push("");
  lines.push(
    input.key === "projecto" || input.key === "tip"
      ? `Entrega um artefacto mínimo que prove progresso no objectivo: «${input.statement}».`
      : `Explica, com um exemplo teu, o essencial de «${input.title}» no contexto de «${input.topic}», sem copiar o texto acima.`,
  );
  lines.push("");
  lines.push(
    "> Vídeo + texto + verificação = caminho personalizado. O vídeo acompanha; a verificação prova que estudaste o conteúdo do objectivo.",
  );

  return lines.join("\n");
}

/** Primeira frase útil de um extracto (wiki/pesquisa) para virar facto de quiz. */
function factSentence(raw: string | undefined, max = 140): string | null {
  const text = raw?.replace(/\s+/g, " ").trim();
  if (!text || text.length < 24) return null;
  const cut = text.match(/^.{20,140}?[.!?](?=\s|$)/)?.[0] ?? text.slice(0, max);
  const cleaned = cut.replace(/\s+/g, " ").trim();
  return cleaned.length >= 24 ? cleaned : null;
}

/**
 * Diagnóstico / check = conteúdo do tópico (o que estás a estudar).
 * Não é meta-estudo («como estudar»); usa factHint da pesquisa quando existe.
 */
export function buildTopicDiagnosis(input: {
  title: string;
  topic: string;
  key: string;
  statement?: string;
  factHint?: string;
}): Pick<
  CurriculumPlanNode,
  "checkPrompt" | "checkChoices" | "correctChoiceId" | "checkExplanation"
> {
  const topic = input.topic.trim() || "este tema";
  const title = input.title.trim() || topic;
  const fact = factSentence(input.factHint);

  if (fact) {
    return {
      checkPrompt: `Sobre «${title}» no mapa de «${topic}», qual afirmação sobre o conteúdo está correcta?`,
      checkChoices: [
        { id: "a", text: fact },
        {
          id: "b",
          text: `«${topic}» não tem conceitos próprios — só serve para memorizar nomes.`,
        },
        {
          id: "c",
          text: `«${title}» trata de um tema sem relação com «${topic}».`,
        },
        {
          id: "d",
          text: `O essencial de «${topic}» é ignorar a definição e saltar para outra matéria.`,
        },
      ],
      correctChoiceId: "a",
      checkExplanation: `A opção correcta resume o conteúdo de «${title}» / «${topic}» segundo a pesquisa do mapa.`,
    };
  }

  const byKey: Record<
    string,
    {
      prompt: string;
      choices: Array<{ id: string; text: string }>;
      correct: string;
      explanation: string;
    }
  > = {
    fundamentos: {
      prompt: `Nos fundamentos de «${topic}», o que descreve melhor o conteúdo desta área?`,
      choices: [
        {
          id: "a",
          text: `«${topic}» resolve um tipo de problema concreto e tem vocabulário e ideias mínimas próprias`,
        },
        { id: "b", text: `«${topic}» é só um rótulo — não há conceitos a aprender` },
        { id: "c", text: `Fundamentos de «${topic}» = decorar a palavra «${title}» sem significado` },
        { id: "d", text: `«${topic}» e qualquer outra matéria são o mesmo conteúdo` },
      ],
      correct: "a",
      explanation: `Fundamentos de «${topic}» = problema + vocabulário próprio do tema.`,
    },
    "conceitos-core": {
      prompt: `Sobre os conceitos centrais de «${topic}» («${title}»), o que é verdade?`,
      choices: [
        {
          id: "a",
          text: `Há ideias-chave de «${topic}» que se explicam com definição e exemplo concreto`,
        },
        { id: "b", text: `Em «${topic}» não existem conceitos — só ferramentas aleatórias` },
        { id: "c", text: `«${title}» não faz parte do mapa de «${topic}»` },
        { id: "d", text: `Os conceitos de «${topic}» são os mesmos de qualquer outra área` },
      ],
      correct: "a",
      explanation: `Conceitos de «${topic}» são específicos e verificáveis com exemplos.`,
    },
    ferramentas: {
      prompt: `Sobre ferramentas / ambiente de «${topic}», qual afirmação de conteúdo é correcta?`,
      choices: [
        {
          id: "a",
          text: `«${topic}» usa um ambiente e ferramentas próprias (instalação + primeiro exemplo a correr)`,
        },
        { id: "b", text: `«${topic}» não precisa de ambiente — basta ler o título «${title}»` },
        { id: "c", text: `As ferramentas de «${topic}» são as de uma área sem relação` },
        { id: "d", text: `Em «${topic}» o setup é irrelevante para o conteúdo` },
      ],
      correct: "a",
      explanation: `O conteúdo de ferramentas em «${topic}» inclui ambiente e um exemplo verificável.`,
    },
    "pratica-guiada": {
      prompt: `Na prática de «${topic}», o que descreve o conteúdo correcto?`,
      choices: [
        {
          id: "a",
          text: `Exercícios e tarefas curtas específicas de «${topic}», com resultado certo/errado`,
        },
        { id: "b", text: `Prática de «${topic}» = exercícios de outra matéria qualquer` },
        { id: "c", text: `«${title}» não inclui prática — só leitura de nomes` },
        { id: "d", text: `Não há critérios de aceitação em «${topic}»` },
      ],
      correct: "a",
      explanation: `A prática guiada avalia conteúdo de «${topic}» com critério claro.`,
    },
    padroes: {
      prompt: `Em padrões de «${topic}», qual descrição de conteúdo é correcta?`,
      choices: [
        {
          id: "a",
          text: `«${topic}» tem padrões e anti-padrões típicos, com trade-offs próprios`,
        },
        { id: "b", text: `Padrões de «${topic}» = copiar padrões de áreas sem relação` },
        { id: "c", text: `«${title}» nega a existência de boas práticas em «${topic}»` },
        { id: "d", text: `Em «${topic}» não há trade-offs a conhecer` },
      ],
      correct: "a",
      explanation: `Padrões fazem parte do conteúdo de «${topic}», com prós e contras.`,
    },
    projecto: {
      prompt: `No projecto de «${topic}», o que é o conteúdo esperado?`,
      choices: [
        {
          id: "a",
          text: `Um artefacto (demo, repo ou relatório) que use ideias de «${topic}»`,
        },
        { id: "b", text: `Um projecto de outra matéria apresentado como «${topic}»` },
        { id: "c", text: `Só o título «${title}», sem artefacto` },
        { id: "d", text: `«${topic}» não admite projecto — só vídeos genéricos` },
      ],
      correct: "a",
      explanation: `O projecto tem de evidenciar conteúdo de «${topic}».`,
    },
    tip: {
      prompt: `O tip do mapa de «${topic}» resume que conteúdo?`,
      choices: [
        {
          id: "a",
          text: `O caminho deste mapa de «${topic}»: fundamentos → conceitos → prática → projecto`,
        },
        { id: "b", text: `O tip mistura progresso de outros objectivos neste de «${topic}»` },
        { id: "c", text: `O tip substitui todo o conteúdo anterior de «${topic}»` },
        { id: "d", text: `«${title}» não está ligado a «${topic}»` },
      ],
      correct: "a",
      explanation: `O tip fecha o conteúdo deste mapa de «${topic}».`,
    },
    "stack-framework": {
      prompt: `Sobre o framework/ecossistema de «${topic}», o que é correcto?`,
      choices: [
        {
          id: "a",
          text: `Há um framework central (ex. Spring Boot) que acelera APIs/serviços desta carreira`,
        },
        { id: "b", text: `Frameworks são opcionais e irrelevantes para «${topic}»` },
        { id: "c", text: `«${title}» trata só de soft skills, sem framework` },
        { id: "d", text: `O ecossistema de «${topic}» é o mesmo de qualquer língua humana` },
      ],
      correct: "a",
      explanation: `O framework faz parte do conteúdo profissional de «${topic}».`,
    },
    "fullstack-complementos": {
      prompt: `Sobre complementos full-stack em «${topic}», o que é verdade?`,
      choices: [
        {
          id: "a",
          text: `Dados, API/UI e entrega complementam a linguagem para um perfil empregável`,
        },
        { id: "b", text: `Full-stack = ignorar a linguagem «${topic}»` },
        { id: "c", text: `Complementos misturam objectivos de outras carreiras neste mapa` },
        { id: "d", text: `Só a sintaxe da linguagem basta para o mercado` },
      ],
      correct: "a",
      explanation: `Full-stack complementar completa o perfil sem abandonar «${topic}».`,
    },
    "soft-skills": {
      prompt: `Nas soft skills desta carreira de «${topic}», o que descreve o conteúdo?`,
      choices: [
        {
          id: "a",
          text: `Reuniões, PRs, comunicação e trade-offs fazem parte do trabalho — não só código`,
        },
        { id: "b", text: `Soft skills não existem em carreiras de «${topic}»` },
        { id: "c", text: `O trabalho é 100% código isolado, sem reuniões` },
        { id: "d", text: `«${title}» é só decorar nomes de frameworks` },
      ],
      correct: "a",
      explanation: `Soft skills são conteúdo real da carreira de «${topic}».`,
    },
    "carreira-realidade": {
      prompt: `Sobre como é o trabalho em «${topic}», qual afirmação é correcta?`,
      choices: [
        {
          id: "a",
          text: `O dia mistura código, debug, reuniões curtas, reviews e manutenção — não só features novas`,
        },
        { id: "b", text: `Programadores de «${topic}» só escrevem código novo 8 h/dia` },
        { id: "c", text: `Não há manutenção nem colaboração nesta carreira` },
        { id: "d", text: `«${title}» nega a existência de reuniões` },
      ],
      correct: "a",
      explanation: `A realidade da carreira de «${topic}» inclui muito trabalho para além de código novo.`,
    },
  };

  const pack = byKey[input.key] ?? byKey["conceitos-core"]!;
  return {
    checkPrompt: pack.prompt,
    checkChoices: pack.choices,
    correctChoiceId: pack.correct,
    checkExplanation: pack.explanation,
  };
}

/** Corpo rico para nós de carreira (stack, soft skills, dia-a-dia). */
export function buildCareerLessonBody(input: {
  title: string;
  key: string;
  topic: string;
  statement: string;
  levelNote: string;
  career: DevCareerProfile;
  hits: WebHit[];
}): string {
  const c = input.career;
  const base = buildLessonBody({
    title: input.title,
    key: input.key,
    topic: input.topic,
    statement: input.statement,
    levelNote: input.levelNote,
    hits: input.hits,
  });

  const extra: string[] = ["", "## Carreira de desenvolvedor (conteúdo deste objectivo)", ""];

  if (input.key === "stack-framework") {
    extra.push(`**Framework central:** ${c.coreFramework.name}`);
    extra.push("");
    extra.push(c.coreFramework.why);
    extra.push("");
    extra.push("### Materiais / ferramentas do ecossistema");
    extra.push("");
    for (const item of c.complementary) {
      extra.push(`- **${item.name}** — ${item.why}`);
    }
  } else if (input.key === "fullstack-complementos") {
    extra.push("### Caminho full-stack a partir desta linguagem");
    extra.push("");
    for (const layer of c.fullStackPath) {
      extra.push(`- **${layer.layer}:** ${layer.items} — ${layer.why}`);
    }
    extra.push("");
    extra.push("### Complementares a conhecer");
    extra.push("");
    for (const item of c.complementary) {
      extra.push(`- **${item.name}** — ${item.why}`);
    }
  } else if (input.key === "soft-skills") {
    extra.push("### Soft skills nesta carreira");
    extra.push("");
    for (const skill of c.softSkills) {
      extra.push(`- **${skill.name}** — ${skill.how}`);
    }
    extra.push("");
    extra.push("### Reuniões e rituais (o que fazes mesmo)");
    extra.push("");
    for (const m of c.meetings) {
      extra.push(`- **${m.name}** — ${m.purpose}`);
    }
  } else if (input.key === "carreira-realidade") {
    extra.push(`**Tipo de carreira:** ${c.careerType}`);
    extra.push("");
    extra.push(`**Papel:** ${c.roleTitle}`);
    extra.push("");
    extra.push(c.whatItsLike);
    extra.push("");
    extra.push("### O que fazes no trabalho (além de «só código»)");
    extra.push("");
    for (const item of c.whatYouDo) {
      extra.push(`- ${item}`);
    }
    extra.push("");
    extra.push("### Ferramentas do ofício");
    extra.push("");
    for (const tool of c.workTools) {
      extra.push(`- **${tool.name}** — ${tool.why}`);
    }
  } else if (input.key === "ferramentas") {
    extra.push("### Ferramentas do dia-a-dia nesta carreira");
    extra.push("");
    for (const tool of c.workTools.slice(0, 6)) {
      extra.push(`- **${tool.name}** — ${tool.why}`);
    }
  } else if (input.key === "tip") {
    extra.push(`Fecha o perfil **${c.roleTitle}**: linguagem + ${c.coreFramework.name} + complementos + soft skills.`);
    extra.push("");
    extra.push(c.whatItsLike);
  }

  return `${base}\n${extra.join("\n")}`;
}

/** Plano heurístico: estrutura do mapa + corpos preparados (pesquisa global como base). */
export function heuristicCurriculumPlan(input: {
  statement: string;
  primaryLabel: string;
  experienceLevel: string;
  searchSnippets: string[];
  searchHits?: WebHit[];
  primarySlug?: string;
}): CurriculumPlan {
  const topic = isCustomGoalLabel(input.primaryLabel)
      ? input.statement.replace(/^quero (aprender|estudar)\s+/i, "").slice(0, 80)
      : input.primaryLabel;

  const levelNote =
    input.experienceLevel === "none" || input.experienceLevel === "beginner"
      ? "Nível: iniciante — vocabulário, ideias centrais e primeiro exercício guiado."
      : input.experienceLevel === "intermediate"
        ? "Nível: intermédio — aprofunda conceitos e prática com critérios de qualidade."
        : "Nível: avançado — padrões, trade-offs e projecto integrador.";

  const hits: WebHit[] =
    input.searchHits ??
    input.searchSnippets.map((snippet) => ({
      title: topic,
      snippet,
    }));

  const career = resolveDevCareer(input.primarySlug, input.statement);
  if (career) {
    return heuristicDevCareerPlan({
      statement: input.statement,
      topic,
      levelNote,
      hits,
      career,
    });
  }

  const keys = [
    "fundamentos",
    "conceitos-core",
    "ferramentas",
    "pratica-guiada",
    "padroes",
    "projecto",
    "tip",
  ] as const;

  const titles: Record<(typeof keys)[number], string> = {
    fundamentos: `Fundamentos — ${topic}`,
    "conceitos-core": `Conceitos — ${topic}`,
    ferramentas: `Materiais e ambiente — ${topic}`,
    "pratica-guiada": `Prática — ${topic}`,
    padroes: `Padrões — ${topic}`,
    projecto: `Projecto — ${topic}`,
    tip: `Fecho — ${topic}`,
  };

  const nodes: CurriculumPlanNode[] = keys.map((key, index) => {
    const title = titles[key];
    const isTip = key === "tip";
    const check = buildTopicDiagnosis({ title, topic, key });
    return {
      key,
      title,
      summary: isTip
        ? `Tip do mapa gerado para: ${input.statement}`
        : `${title}. ${levelNote}`,
      area: isTip ? "objetivo" : index < 3 ? "base" : index < 5 ? "pratica" : "integracao",
      body: buildLessonBody({
        title,
        key,
        topic,
        statement: input.statement,
        levelNote,
        hits,
      }),
      ...check,
      videoQueries: {
        pt: `${topic} ${key === "tip" ? "curso" : title} tutorial português`,
        en: `${topic} ${title} tutorial`,
        es: `${topic} tutorial español`,
      },
    };
  });

  const edges: CurriculumPlanEdge[] = [
    { nodeKey: "conceitos-core", prereqKey: "fundamentos", nature: "required" },
    { nodeKey: "ferramentas", prereqKey: "fundamentos", nature: "required" },
    { nodeKey: "pratica-guiada", prereqKey: "conceitos-core", nature: "required" },
    { nodeKey: "pratica-guiada", prereqKey: "ferramentas", nature: "required" },
    { nodeKey: "padroes", prereqKey: "pratica-guiada", nature: "required" },
    { nodeKey: "projecto", prereqKey: "padroes", nature: "required" },
    { nodeKey: "tip", prereqKey: "projecto", nature: "required" },
    { nodeKey: "projecto", prereqKey: "ferramentas", nature: "recommended" },
  ];

  return {
    tipKey: "tip",
    topicLabel: topic,
    searchSummary:
      hits.length > 0
        ? `Pesquisa: ${hits
            .slice(0, 2)
            .map((h) => h.title)
            .join(" · ")}`
        : `Mapa estruturado a partir do objectivo «${input.statement}».`,
    nodes,
    edges,
  };
}

function heuristicDevCareerPlan(input: {
  statement: string;
  topic: string;
  levelNote: string;
  hits: WebHit[];
  career: DevCareerProfile;
}): CurriculumPlan {
  const { career, topic, statement, levelNote, hits } = input;
  const fw = career.coreFramework.name;

  const titles: Record<string, string> = {
    fundamentos: `Fundamentos — ${topic}`,
    "conceitos-core": `Conceitos — ${topic}`,
    ferramentas: `Ambiente e ferramentas — ${topic}`,
    "pratica-guiada": `Prática — ${topic}`,
    "stack-framework": `${fw} — ecossistema de ${topic}`,
    "fullstack-complementos": `Full-stack complementar — ${topic}`,
    padroes: `Padrões profissionais — ${topic}`,
    "soft-skills": `Soft skills e equipa — ${topic}`,
    "carreira-realidade": `Como é ser ${career.roleTitle}`,
    projecto: `Projecto empregável — ${topic}`,
    tip: `Fecho de carreira — ${topic}`,
  };

  const careerKeys = DEV_CAREER_STAGES.map((s) => s.key);
  const nodes: CurriculumPlanNode[] = careerKeys.map((key, index) => {
    const title = titles[key] ?? key;
    const isTip = key === "tip";
    const check = buildTopicDiagnosis({ title, topic, key, statement });
    const useCareerBody = [
      "stack-framework",
      "fullstack-complementos",
      "soft-skills",
      "carreira-realidade",
      "ferramentas",
      "tip",
    ].includes(key);

    const body = useCareerBody
      ? buildCareerLessonBody({
          title,
          key,
          topic,
          statement,
          levelNote,
          career,
          hits,
        })
      : buildLessonBody({
          title,
          key,
          topic,
          statement,
          levelNote,
          hits,
        });

    const videoTopic =
      key === "stack-framework"
        ? career.researchHints.framework
        : key === "fullstack-complementos"
          ? career.researchHints.fullstack
          : key === "soft-skills"
            ? career.researchHints.softSkills
            : key === "carreira-realidade"
              ? career.researchHints.dayInLife
              : `${topic} ${title}`;

    return {
      key,
      title,
      summary: isTip
        ? `Fecha a carreira ${career.roleTitle}: stack + soft skills + evidência.`
        : `${title}. ${career.careerType}. ${levelNote}`,
      area: isTip
        ? "objetivo"
        : index < 4
          ? "base"
          : index < 7
            ? "pratica"
            : "integracao",
      body,
      ...check,
      videoQueries: {
        pt: `${videoTopic} português`,
        en: videoTopic,
        es: `${videoTopic} español`,
      },
      documents: undefined,
    };
  });

  const edges: CurriculumPlanEdge[] = [
    { nodeKey: "conceitos-core", prereqKey: "fundamentos", nature: "required" },
    { nodeKey: "ferramentas", prereqKey: "fundamentos", nature: "required" },
    { nodeKey: "pratica-guiada", prereqKey: "conceitos-core", nature: "required" },
    { nodeKey: "pratica-guiada", prereqKey: "ferramentas", nature: "required" },
    { nodeKey: "stack-framework", prereqKey: "pratica-guiada", nature: "required" },
    { nodeKey: "fullstack-complementos", prereqKey: "stack-framework", nature: "required" },
    { nodeKey: "padroes", prereqKey: "fullstack-complementos", nature: "required" },
    { nodeKey: "soft-skills", prereqKey: "padroes", nature: "required" },
    { nodeKey: "carreira-realidade", prereqKey: "soft-skills", nature: "required" },
    { nodeKey: "projecto", prereqKey: "carreira-realidade", nature: "required" },
    { nodeKey: "projecto", prereqKey: "stack-framework", nature: "recommended" },
    { nodeKey: "tip", prereqKey: "projecto", nature: "required" },
  ];

  return {
    tipKey: "tip",
    topicLabel: topic,
    searchSummary: `Carreira ${career.roleTitle}: ${fw} + full-stack + soft skills. ${
      hits[0]?.title ? `Pesquisa: ${hits[0].title}` : ""
    }`.slice(0, 280),
    nodes,
    edges,
  };
}
