import { z } from "zod";

export const TUTOR_BLOCKED = "BLOCKED/CONFIGURATION_REQUIRED";

export const TUTOR_HELP_LEVELS = [0, 1, 2, 3, 4, 5, 6] as const;
export type TutorHelpLevel = (typeof TUTOR_HELP_LEVELS)[number];

export const TUTOR_HELP_LABELS: Record<TutorHelpLevel, string> = {
  0: "Nenhuma ajuda — só reformula a minha pergunta",
  1: "Pergunta orientadora",
  2: "Dica curta",
  3: "Explicação",
  4: "Exemplo semelhante (não a solução)",
  5: "Correção guiada",
  6: "Solução comentada",
};

export type TutorRole = "user" | "assistant";

export type TutorTurn = {
  role: "system" | TutorRole;
  content: string;
};

export type TutorLabFile = { path: string; content: string };

export type TutorContext = {
  nodeTitle: string;
  nodeSummary: string;
  moduleSummary: string | null;
  hasLab: boolean;
  helpLevel: TutorHelpLevel;
  labFiles: TutorLabFile[] | null;
};

const LEVEL_RULES: Record<TutorHelpLevel, string> = {
  0: "Nível 0: não dês pistas nem respostas. No máximo reformula a pergunta do aluno ou pede clarificação.",
  1: "Nível 1: só faz perguntas orientadoras. Não dês a resposta nem código da solução.",
  2: "Nível 2: dá uma dica curta (1–2 frases). Sem solução completa.",
  3: "Nível 3: explica o conceito em jogo. Ainda sem o código final do exercício.",
  4: "Nível 4: mostra um exemplo análogo noutra situação. Não copies a solução do exercício actual.",
  5: "Nível 5: correção guiada passo a passo. Podes apontar o erro no código do aluno sem colar a solução final.",
  6: "Nível 6: podes apresentar uma solução comentada — excepto se houver testes ocultos (aí o máximo efectivo é 5).",
};

export function effectiveTutorHelpLevel(helpLevel: TutorHelpLevel, hasLab: boolean): TutorHelpLevel {
  if (hasLab && helpLevel === 6) return 5;
  return helpLevel;
}

export function aiTutorReady(apiKey?: string | null) {
  return Boolean(apiKey?.trim());
}

export function tutorSystemPrompt(context: TutorContext): string {
  const level = effectiveTutorHelpLevel(context.helpLevel, context.hasLab);
  const lines = [
    "És o tutor da Programeint. Respondes em pt-BR, de forma curta, técnica e directa.",
    `O aluno está no nó "${context.nodeTitle}".`,
    `Resumo do nó: ${context.nodeSummary}`,
    LEVEL_RULES[level],
    `Nível de assistência pedido: ${context.helpLevel} (efectivo: ${level}).`,
  ];

  if (context.moduleSummary) {
    lines.push(`Módulo associado: ${context.moduleSummary}`);
  }

  if (context.hasLab) {
    lines.push(
      "Este nó tem exercício com testes ocultos. Nunca escrevas a solução completa nem o corpo final do método avaliado.",
    );
  }

  if (context.labFiles && context.labFiles.length > 0) {
    lines.push("Código actual do aluno no lab (pode estar incompleto ou errado):");
    for (const file of context.labFiles) {
      const clipped = file.content.length > 4000 ? `${file.content.slice(0, 4000)}\n…[cortado]` : file.content;
      lines.push(`--- ${file.path} ---\n${clipped}`);
    }
  }

  lines.push(
    "Se não souberes, diz que não sabes. Não inventes APIs, resultados de testes, progresso do aluno nem certificados.",
  );

  return lines.join("\n");
}
