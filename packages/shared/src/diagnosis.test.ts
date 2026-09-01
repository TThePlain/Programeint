import { describe, expect, it } from "vitest";
import { pickNextQuestion, recommendedStart, topologicalOrder } from "./diagnosis";

const nodes = [
  { id: "logic", slug: "logic" },
  { id: "algo", slug: "algorithms" },
  { id: "java", slug: "java" },
];
const prereqs = [
  { nodeId: "algo", prerequisiteId: "logic", nature: "required" as const },
  { nodeId: "java", prerequisiteId: "algo", nature: "required" as const },
];

describe("diagnosis engine", () => {
  it("avalia fundamentos antes do alvo", () => {
    const next = pickNextQuestion({
      targetNodeId: "java",
      nodes,
      prereqs,
      mastery: {},
      unusedQuestions: { logic: ["q1"], algo: ["q2"], java: ["q3"] },
      askedCount: 0,
      maxQuestions: 6,
    });
    expect(next).toEqual({ nodeId: "logic", questionId: "q1" });
  });

  it("não pergunta dependentes se o pré-requisito falhou", () => {
    const next = pickNextQuestion({
      targetNodeId: "java",
      nodes,
      prereqs,
      mastery: { logic: "failed" },
      unusedQuestions: { logic: [], algo: ["q2"], java: ["q3"] },
      askedCount: 1,
      maxQuestions: 6,
    });
    expect(next).toEqual({ skipNodeId: "algo" });
  });

  it("propaga skip quando o pré-requisito já foi saltado", () => {
    const next = pickNextQuestion({
      targetNodeId: "java",
      nodes,
      prereqs,
      mastery: { logic: "failed", algo: "skipped" },
      unusedQuestions: { logic: [], algo: [], java: ["q3"] },
      askedCount: 1,
      maxQuestions: 6,
    });
    expect(next).toEqual({ skipNodeId: "java" });
  });

  it("recomenda o primeiro nó falhado", () => {
    expect(
      recommendedStart({
        targetNodeId: "java",
        prereqs,
        mastery: { logic: "passed", algo: "failed" },
      }),
    ).toBe("algo");
  });

  it("ordena topologicamente", () => {
    expect(topologicalOrder(["java", "logic", "algo"], prereqs)).toEqual(["logic", "algo", "java"]);
  });

  it("ignora pré-requisitos recommended no caminho de diagnóstico/estudo", () => {
    const withOptional = [
      ...prereqs,
      { nodeId: "java", prerequisiteId: "sql", nature: "recommended" as const },
    ];
    const next = pickNextQuestion({
      targetNodeId: "java",
      nodes: [...nodes, { id: "sql", slug: "sql" }],
      prereqs: withOptional,
      mastery: {},
      unusedQuestions: { sql: ["qs"], logic: ["q1"], algo: ["q2"], java: ["q3"] },
      askedCount: 0,
      maxQuestions: 6,
    });
    expect(next).toEqual({ nodeId: "logic", questionId: "q1" });
  });
});
