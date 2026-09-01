import { describe, expect, it } from "vitest";
import {
  GOAL_CATALOG,
  STUDY_PROGRAM_STAGES,
  isCustomGoalLabel,
  onboardingSchema,
} from "./onboarding";

describe("onboardingSchema", () => {
  const valid = {
    statement: "Quero aprender Java para backend.",
    primaryTarget: "java",
    experienceLevel: "beginner",
    knownTopics: ["git"],
    weeklyHours: 6,
    sessionMinutes: 45,
    prefersVideo: true,
    prefersReading: true,
    prefersPractice: true,
  };

  it("aceita um onboarding válido", () => {
    expect(onboardingSchema.parse(valid).primaryTarget).toBe("java");
  });

  it("aceita stacks tech (React, backend)", () => {
    const result = onboardingSchema.parse({
      ...valid,
      statement: "Quero dominar React para frontend.",
      primaryTarget: "react",
      experienceLevel: "none",
    });
    expect(result.primaryTarget).toBe("react");
  });

  it("aceita objectivo tech personalizado com detalhe", () => {
    const result = onboardingSchema.parse({
      ...valid,
      statement: "Quero aprender GraphQL com Apollo.",
      primaryTarget: "custom",
    });
    expect(result.primaryTarget).toBe("custom");
  });

  it("rejeita alvo fora do catálogo", () => {
    const result = onboardingSchema.safeParse({ ...valid, primaryTarget: "english" });
    expect(result.success).toBe(false);
  });

  it("exige pelo menos um tipo de material", () => {
    const result = onboardingSchema.safeParse({
      ...valid,
      prefersVideo: false,
      prefersReading: false,
      prefersPractice: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("study program methodology", () => {
  it("tem 7 etapas pedagógicas fixas", () => {
    expect(STUDY_PROGRAM_STAGES).toHaveLength(7);
    expect(STUDY_PROGRAM_STAGES.map((s) => s.key)).toEqual([
      "fundamentos",
      "conceitos-core",
      "ferramentas",
      "pratica-guiada",
      "padroes",
      "projecto",
      "tip",
    ]);
  });

  it("catálogo é só tecnologia e programação", () => {
    const families = new Set(GOAL_CATALOG.map((g) => g.family));
    expect(families.has("programacao")).toBe(true);
    expect(families.has("tech")).toBe(true);
    expect(families.has("custom")).toBe(true);
    expect(families.has("idiomas")).toBe(false);
    expect(families.has("ciencias")).toBe(false);
  });

  it("detecta labels Outro (novos e antigos)", () => {
    expect(isCustomGoalLabel("Outro (tecnologia / programação)")).toBe(true);
    expect(isCustomGoalLabel("Outro (qualquer objectivo)")).toBe(true);
    expect(isCustomGoalLabel("Java")).toBe(false);
  });
});
