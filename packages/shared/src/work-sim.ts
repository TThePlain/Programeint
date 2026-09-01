import { z } from "zod";
import { resolveDevCareer, type DevCareerProfile } from "./dev-career";

export const WORK_SIM_KINDS = ["standup", "ticket", "pr"] as const;
export type WorkSimKind = (typeof WORK_SIM_KINDS)[number];

export const workSimStandupSchema = z.object({
  kind: z.literal("standup"),
  yesterday: z.string().trim().min(12, "Descreve o que fizeste ontem (mín. 12 caracteres).").max(400),
  today: z.string().trim().min(12, "Descreve o foco de hoje.").max(400),
  blocker: z.string().trim().min(3, "Indica bloqueio ou «nenhum».").max(400),
});

export const workSimTicketSchema = z.object({
  kind: z.literal("ticket"),
  clarifyingQuestions: z
    .string()
    .trim()
    .min(40, "Faz pelo menos 2 perguntas de clarificação.")
    .max(1200),
  acceptanceCriteria: z
    .string()
    .trim()
    .min(40, "Escreve critérios de aceitação concretos.")
    .max(1200),
  estimateNote: z.string().trim().min(8, "Indica uma estimativa / incerteza.").max(400),
});

export const workSimPrSchema = z.object({
  kind: z.literal("pr"),
  summary: z.string().trim().min(20, "Resume o que o PR muda.").max(600),
  howToTest: z.string().trim().min(20, "Explica como testar.").max(800),
  reviewComment: z
    .string()
    .trim()
    .min(30, "Escreve um comentário de review útil (não só «LGTM»).")
    .max(1200),
});

export const workSimSubmitSchema = z.discriminatedUnion("kind", [
  workSimStandupSchema,
  workSimTicketSchema,
  workSimPrSchema,
]);

export type WorkSimSubmitInput = z.infer<typeof workSimSubmitSchema>;

export type WorkSimRitual = {
  kind: WorkSimKind;
  title: string;
  durationHint: string;
  purpose: string;
  /** Contexto do cenário (ticket mal escrito, PR fictício…). */
  scenario: string;
  tips: string[];
};

export function buildWorkSimRituals(
  career: DevCareerProfile | null,
  statement: string,
): WorkSimRitual[] {
  const role = career?.roleTitle ?? "desenvolvedor";
  const fw = career?.coreFramework.name ?? "a stack do teu objectivo";
  const goal = statement.trim() || "o teu objectivo";

  return [
    {
      kind: "standup",
      title: "Daily / stand-up (60s)",
      durationHint: "~1 minuto",
      purpose: "Treinar o ritual real: ontem · hoje · bloqueios — sem relatório longo.",
      scenario: `És ${role}. A equipa está a construir algo ligado a «${goal}» com ${fw}. É a daily das 10:00. Tens 60 segundos.`,
      tips: [
        "Sé concreto («fechei o endpoint X», não «andei a ver coisas»).",
        "Um bloqueio claro pede ajuda; «nenhum» também é válido.",
        "Não uses a daily para desenhar arquitectura.",
      ],
    },
    {
      kind: "ticket",
      title: "Ticket mal escrito → clarificar",
      durationHint: "~5 minutos",
      purpose: "Antes de codar: perguntas e critérios. É o trabalho real com produto.",
      scenario: `Ticket recebido (vago de propósito):\n«Precisamos daquela parte do ${fw} a funcionar melhor para o utilizador. Urgente. Faz aí.»\n\nObjectivo da equipa: «${goal}».\nO teu trabalho: não implementes — clarifica.`,
      tips: [
        "Pergunta o quê / para quem / quando está «feito».",
        "Critérios de aceitação = pass/fail observável.",
        "Estimativa pode ser «incerto até clarificar X».",
      ],
    },
    {
      kind: "pr",
      title: "Pull request + review",
      durationHint: "~5 minutos",
      purpose: "Escrever contexto de PR e um review útil — comunicação técnica.",
      scenario: `Colega abriu um PR fictício na vossa stack (${fw}):\n«Add stuff for ${goal}»\nDiff imaginário: endpoint novo + teste em falta + nome de variável pouco claro.\n\nTu: (1) escreves o resumo/como testar como se fosses o autor; (2) deixas um comentário de review construtivo.`,
      tips: [
        "PR bom = contexto + como testar.",
        "Review: aponta o problema e sugere alternativa — sem ataque pessoal.",
        "«LGTM» sozinho não conta como evidência.",
      ],
    },
  ];
}

export function evaluateWorkSimSubmit(input: WorkSimSubmitInput): {
  passed: boolean;
  feedback: string[];
  evidenceMarkdown: string;
} {
  const feedback: string[] = [];

  if (input.kind === "standup") {
    if (/ontem fiz coisas|trabalhei|etc\.?$/i.test(input.yesterday)) {
      feedback.push("«Ontem» está demasiado vago — nomeia uma tarefa concreta.");
    }
    if (/vou ver|olhar|etc\.?$/i.test(input.today)) {
      feedback.push("«Hoje» precisa de um resultado verificável (ex.: fechar ticket X).");
    }
    const evidence = `# Stand-up\n\n- **Ontem:** ${input.yesterday}\n- **Hoje:** ${input.today}\n- **Bloqueio:** ${input.blocker}\n`;
    const passed = feedback.length === 0;
    if (passed) feedback.push("Stand-up claro e no formato da daily.");
    return { passed, feedback, evidenceMarkdown: evidence };
  }

  if (input.kind === "ticket") {
    const questions = (input.clarifyingQuestions.match(/\?/g) ?? []).length;
    if (questions < 2) {
      feedback.push("Faz pelo menos 2 perguntas de clarificação (usa «?»).");
    }
    if (!/dado|quando|aceite|pass|fail|utilizador|critério/i.test(input.acceptanceCriteria)) {
      feedback.push("Critérios de aceitação: inclui condições observáveis (pass/fail).");
    }
    if (/lgtm|só fazer|é fácil/i.test(input.estimateNote)) {
      feedback.push("Estimativa: admite incerteza ou parte o trabalho — evita «é fácil».");
    }
    const evidence = `# Ticket clarificado\n\n## Perguntas\n${input.clarifyingQuestions}\n\n## Critérios de aceitação\n${input.acceptanceCriteria}\n\n## Estimativa / incerteza\n${input.estimateNote}\n`;
    const passed = feedback.length === 0;
    if (passed) feedback.push("Ticket clarificado como num refinamento real.");
    return { passed, feedback, evidenceMarkdown: evidence };
  }

  // pr
  if (/lgtm\s*$/i.test(input.reviewComment.trim()) || input.reviewComment.trim().length < 40) {
    feedback.push("Review: explica o que melhorar (não basta LGTM).");
  }
  if (!/test|curl|browser|cenário|passo/i.test(input.howToTest)) {
    feedback.push("Como testar: inclui passos concretos (curl, browser, cenário).");
  }
  const evidence = `# Pull request\n\n## Resumo\n${input.summary}\n\n## Como testar\n${input.howToTest}\n\n## Comentário de review\n${input.reviewComment}\n`;
  const passed = feedback.length === 0;
  if (passed) feedback.push("PR + review no padrão de equipa.");
  return { passed, feedback, evidenceMarkdown: evidence };
}

export function workSimCareerForGoal(primarySlug?: string | null, statement?: string | null) {
  return resolveDevCareer(primarySlug, statement);
}
