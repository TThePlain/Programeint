import { describe, expect, it } from "vitest";
import { aiTutorReady, effectiveTutorHelpLevel, tutorSystemPrompt } from "./tutor";

describe("aiTutorReady", () => {
  it("exige chave real", () => {
    expect(aiTutorReady(undefined)).toBe(false);
    expect(aiTutorReady(null)).toBe(false);
    expect(aiTutorReady("")).toBe(false);
    expect(aiTutorReady("   ")).toBe(false);
    expect(aiTutorReady("sk-real")).toBe(true);
  });
});

describe("tutorSystemPrompt", () => {
  const base = {
    nodeTitle: "Algoritmos",
    nodeSummary: "Passos determinísticos para resolver um problema.",
    moduleSummary: null as string | null,
    hasLab: false,
    helpLevel: 2 as const,
    labFiles: null as null | Array<{ path: string; content: string }>,
  };

  it("ancora o tutor no nó e no nível", () => {
    const prompt = tutorSystemPrompt(base);
    expect(prompt).toContain("Algoritmos");
    expect(prompt).toContain("Passos determinísticos");
    expect(prompt).toContain("pt-BR");
    expect(prompt).toContain("Nível 2");
  });

  it("proíbe a solução completa quando o nó tem lab", () => {
    const prompt = tutorSystemPrompt({ ...base, hasLab: true, helpLevel: 6 });
    expect(prompt).toContain("testes ocultos");
    expect(prompt).toContain("efectivo: 5");
  });

  it("inclui código do lab quando fornecido", () => {
    const prompt = tutorSystemPrompt({
      ...base,
      labFiles: [{ path: "Solution.java", content: "public class Solution {}" }],
    });
    expect(prompt).toContain("Solution.java");
    expect(prompt).toContain("public class Solution");
  });

  it("inclui o módulo quando existe", () => {
    const prompt = tutorSystemPrompt({ ...base, moduleSummary: "Do problema ao passo a passo." });
    expect(prompt).toContain("Do problema ao passo a passo.");
  });

  it("manda admitir desconhecimento em vez de inventar", () => {
    expect(tutorSystemPrompt(base)).toContain("Não inventes");
  });
});

describe("effectiveTutorHelpLevel", () => {
  it("limita nível 6 a 5 quando há lab", () => {
    expect(effectiveTutorHelpLevel(6, true)).toBe(5);
    expect(effectiveTutorHelpLevel(6, false)).toBe(6);
  });
});
