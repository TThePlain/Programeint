import { describe, expect, it } from "vitest";
import { hrefForAction, pickNextAction, recommendedLab, recommendedStudy } from "./learning";

const prereqs = [
  { nodeId: "algo", prerequisiteId: "logic", nature: "required" as const },
  { nodeId: "java", prerequisiteId: "algo", nature: "required" as const },
];

describe("learning engine", () => {
  it("recomenda o nó falhado para estudo", () => {
    expect(
      recommendedStudy({
        targetNodeId: "java",
        prereqs,
        mastery: { logic: "passed", algo: "failed" },
      }),
    ).toBe("algo");
  });

  it("depois de estudar o falhado, avança para o próximo sem evidência", () => {
    expect(
      recommendedStudy({
        targetNodeId: "java",
        prereqs,
        mastery: { logic: "passed", algo: "studied" },
      }),
    ).toBe("java");
  });

  it("com tip java-backend, OOP entra na trilha depois de Java estudado", () => {
    const backendPrereqs = [
      { nodeId: "algo", prerequisiteId: "logic", nature: "required" as const },
      { nodeId: "java", prerequisiteId: "algo", nature: "required" as const },
      { nodeId: "oop", prerequisiteId: "java", nature: "required" as const },
      { nodeId: "collections", prerequisiteId: "oop", nature: "required" as const },
      { nodeId: "backend", prerequisiteId: "collections", nature: "required" as const },
    ];
    expect(
      recommendedStudy({
        targetNodeId: "backend",
        prereqs: backendPrereqs,
        mastery: { logic: "passed", algo: "passed", java: "studied" },
      }),
    ).toBe("oop");
  });

  it("salta nós sem módulo publicado quando há alternativa na trilha", () => {
    const backendPrereqs = [
      { nodeId: "oop", prerequisiteId: "java", nature: "required" as const },
      { nodeId: "testing", prerequisiteId: "oop", nature: "required" as const },
      { nodeId: "backend", prerequisiteId: "testing", nature: "required" as const },
    ];
    expect(
      recommendedStudy({
        targetNodeId: "backend",
        prereqs: backendPrereqs,
        mastery: { java: "studied" },
        publishedNodeIds: new Set(["java", "oop"]),
      }),
    ).toBe("oop");
  });

  it("recomenda lab só depois de studied ou passed, nunca failed", () => {
    expect(
      recommendedLab({
        targetNodeId: "java",
        prereqs,
        mastery: { logic: "passed", algo: "failed" },
        labNodeIds: new Set(["algo"]),
        passedLabNodeIds: new Set(),
      }),
    ).toBeNull();
    expect(
      recommendedLab({
        targetNodeId: "java",
        prereqs,
        mastery: { logic: "passed", algo: "studied" },
        labNodeIds: new Set(["algo"]),
        passedLabNodeIds: new Set(),
      }),
    ).toBe("algo");
  });

  it("desbloqueia lab quando pré-reqs estão feitos (mesmo sem MCQ)", () => {
    expect(
      recommendedLab({
        targetNodeId: "java",
        prereqs,
        mastery: { logic: "passed", algo: "unassessed" },
        labNodeIds: new Set(["algo"]),
        passedLabNodeIds: new Set(),
      }),
    ).toBe("algo");
  });

  it("prioriza estudo em curso sobre diagnóstico", () => {
    const action = pickNextAction({
      curriculumAvailable: true,
      diagnosisInProgress: true,
      diagnosisCompleted: false,
      studyInProgress: { nodeSlug: "logic", nodeTitle: "Lógica" },
      dueReview: null,
      pendingLab: null,
      pendingProject: null,
      studyNode: { slug: "logic", title: "Lógica" },
      modulePublished: true,
    });
    expect(action.kind).toBe("study_continue");
    expect(hrefForAction(action)).toBe("/estudar/logic");
  });

  it("estuda o módulo sem exigir diagnóstico concluído", () => {
    const action = pickNextAction({
      curriculumAvailable: true,
      diagnosisInProgress: false,
      diagnosisCompleted: false,
      studyInProgress: null,
      dueReview: null,
      pendingLab: null,
      pendingProject: null,
      studyNode: { slug: "logic", title: "Lógica" },
      modulePublished: true,
    });
    expect(action.kind).toBe("study_module");
    expect(hrefForAction(action)).toBe("/estudar/logic");
  });

  it("não inventa módulo quando o nó não tem publicação", () => {
    const action = pickNextAction({
      curriculumAvailable: true,
      diagnosisInProgress: false,
      diagnosisCompleted: true,
      studyInProgress: null,
      dueReview: null,
      pendingLab: null,
      pendingProject: null,
      studyNode: { slug: "spring", title: "Spring" },
      modulePublished: false,
    });
    expect(action.kind).toBe("module_unpublished");
    expect(hrefForAction(action)).toBe("/mapa");
  });

  it("devolve revisão FSRS quando está vencida", () => {
    const action = pickNextAction({
      curriculumAvailable: true,
      diagnosisInProgress: false,
      diagnosisCompleted: true,
      studyInProgress: null,
      dueReview: { questionId: "q1", nodeSlug: "logic", nodeTitle: "Lógica" },
      pendingLab: null,
      pendingProject: null,
      studyNode: { slug: "algo", title: "Algoritmos" },
      modulePublished: true,
    });
    expect(action).toMatchObject({ kind: "review_due", questionId: "q1" });
    expect(hrefForAction(action)).toBe("/revisar");
  });

  it("prioriza o lab do nó já estudado sobre o próximo módulo", () => {
    const action = pickNextAction({
      curriculumAvailable: true,
      diagnosisInProgress: false,
      diagnosisCompleted: true,
      studyInProgress: null,
      dueReview: null,
      pendingLab: { exerciseSlug: "algo-twice", nodeSlug: "algorithms", nodeTitle: "Algoritmos" },
      pendingProject: null,
      studyNode: { slug: "java", title: "Java" },
      modulePublished: true,
    });
    expect(action.kind).toBe("lab_exercise");
    expect(hrefForAction(action)).toBe("/lab/algo-twice");
  });

  it("recomenda o projeto quando o próximo módulo não está publicado", () => {
    const action = pickNextAction({
      curriculumAvailable: true,
      diagnosisInProgress: false,
      diagnosisCompleted: true,
      studyInProgress: null,
      dueReview: null,
      pendingLab: null,
      pendingProject: { projectSlug: "java-catalog", title: "Catálogo de tarefas" },
      studyNode: { slug: "spring", title: "Spring" },
      modulePublished: false,
    });
    expect(action.kind).toBe("project_build");
    expect(hrefForAction(action)).toBe("/projeto/java-catalog");
  });

  it("recomenda o projeto quando o caminho publicado já está feito", () => {
    const action = pickNextAction({
      curriculumAvailable: true,
      diagnosisInProgress: false,
      diagnosisCompleted: true,
      studyInProgress: null,
      dueReview: null,
      pendingLab: null,
      pendingProject: { projectSlug: "java-catalog", title: "Catálogo de tarefas" },
      studyNode: null,
      modulePublished: false,
    });
    expect(action.kind).toBe("project_build");
    expect(hrefForAction(action)).toBe("/projeto/java-catalog");
  });
});
