import { describe, expect, it } from "vitest";
import {
  buildWorkSimRituals,
  evaluateWorkSimSubmit,
  workSimSubmitSchema,
} from "./work-sim";
import { resolveDevCareer } from "./dev-career";

describe("work simulator", () => {
  it("gera 3 rituais para carreira Java", () => {
    const career = resolveDevCareer("java", "Quero ser backend Java");
    const rituals = buildWorkSimRituals(career, "Quero ser backend Java");
    expect(rituals.map((r) => r.kind)).toEqual(["standup", "ticket", "pr"]);
    expect(rituals[0]?.scenario).toMatch(/Spring Boot/i);
  });

  it("standup vago falha; concreto passa", () => {
    expect(
      evaluateWorkSimSubmit({
        kind: "standup",
        yesterday: "ontem fiz coisas",
        today: "vou ver o código",
        blocker: "nenhum",
      }).passed,
    ).toBe(false);

    expect(
      evaluateWorkSimSubmit({
        kind: "standup",
        yesterday: "Fechei o endpoint de auth e corrigi o teste flaky.",
        today: "Abro o PR da validação e peço review.",
        blocker: "nenhum",
      }).passed,
    ).toBe(true);
  });

  it("PR com LGTM falha", () => {
    const result = evaluateWorkSimSubmit({
      kind: "pr",
      summary: "Adiciona endpoint de perfil do utilizador.",
      howToTest: "Abrir o browser e ver a página.",
      reviewComment: "LGTM",
    });
    expect(result.passed).toBe(false);
  });

  it("schema rejeita ticket sem perguntas", () => {
    const parsed = workSimSubmitSchema.safeParse({
      kind: "ticket",
      clarifyingQuestions: "curto",
      acceptanceCriteria: "também curto demais para passar",
      estimateNote: "1 dia",
    });
    expect(parsed.success).toBe(false);
  });
});
