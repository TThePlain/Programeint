import type { MasteryStatus } from "./diagnosis";
import { ancestorsAndSelf, topologicalOrder, type GraphPrereq } from "./diagnosis";

export type NextActionKind =
  | "curriculum_unavailable"
  | "diagnosis_needed"
  | "diagnosis_continue"
  | "study_continue"
  | "review_due"
  | "lab_exercise"
  | "study_module"
  | "project_build"
  | "module_unpublished"
  | "path_complete";

export type NextAction = {
  kind: NextActionKind;
  nodeSlug?: string;
  nodeTitle?: string;
  questionId?: string;
  exerciseSlug?: string;
  projectSlug?: string;
  projectTitle?: string;
};

export function recommendedStudy(input: {
  targetNodeId: string;
  prereqs: GraphPrereq[];
  mastery: Record<string, MasteryStatus>;
  /** Se definido, nós sem módulo publicado são saltados em favor do próximo da trilha. */
  publishedNodeIds?: Set<string>;
}): string | null {
  const path = ancestorsAndSelf(input.targetNodeId, input.prereqs);
  const ordered = topologicalOrder([...path], input.prereqs);
  const failed = ordered.find((id) => input.mastery[id] === "failed");
  if (failed) return failed;
  const nextPublished = ordered.find((id) => {
    const status = input.mastery[id] ?? "unassessed";
    if (!(status === "unassessed" || status === "skipped")) return false;
    if (input.publishedNodeIds && !input.publishedNodeIds.has(id)) return false;
    return true;
  });
  if (nextPublished) return nextPublished;
  // Nada publicado pela frente: devolve o primeiro em falta (para module_unpublished).
  return (
    ordered.find((id) => {
      const status = input.mastery[id] ?? "unassessed";
      return status === "unassessed" || status === "skipped";
    }) ?? null
  );
}

export function recommendedLab(input: {
  targetNodeId: string;
  prereqs: GraphPrereq[];
  mastery: Record<string, MasteryStatus>;
  labNodeIds: Set<string>;
  passedLabNodeIds: Set<string>;
}): string | null {
  const path = ancestorsAndSelf(input.targetNodeId, input.prereqs);
  const ordered = topologicalOrder([...path], input.prereqs);
  for (const id of ordered) {
    if (!input.labNodeIds.has(id) || input.passedLabNodeIds.has(id)) continue;
    const status = input.mastery[id] ?? "unassessed";
    if (status === "failed") continue;
    if (status === "studied" || status === "passed") return id;
    // Também desbloqueia prática quando a etapa já é alcançável (pré-reqs feitos).
    const required = input.prereqs
      .filter((p) => p.nodeId === id && p.nature === "required")
      .map((p) => p.prerequisiteId);
    const prereqsOk = required.every((pid) => {
      const s = input.mastery[pid] ?? "unassessed";
      return s === "studied" || s === "passed" || s === "skipped";
    });
    if (prereqsOk) return id;
  }
  return null;
}

export function pickNextAction(input: {
  curriculumAvailable: boolean;
  diagnosisInProgress: boolean;
  diagnosisCompleted: boolean;
  studyInProgress: { nodeSlug: string; nodeTitle: string } | null;
  dueReview: { questionId: string; nodeSlug: string; nodeTitle: string } | null;
  pendingLab: { exerciseSlug: string; nodeSlug: string; nodeTitle: string } | null;
  pendingProject: { projectSlug: string; title: string } | null;
  studyNode: { slug: string; title: string } | null;
  modulePublished: boolean;
}): NextAction {
  if (!input.curriculumAvailable) return { kind: "curriculum_unavailable" };
  // Continuar estudo a meio tem prioridade sobre diagnóstico a meio.
  if (input.studyInProgress) {
    return {
      kind: "study_continue",
      nodeSlug: input.studyInProgress.nodeSlug,
      nodeTitle: input.studyInProgress.nodeTitle,
    };
  }
  if (input.diagnosisInProgress) return { kind: "diagnosis_continue" };
  if (input.dueReview) {
    return {
      kind: "review_due",
      questionId: input.dueReview.questionId,
      nodeSlug: input.dueReview.nodeSlug,
      nodeTitle: input.dueReview.nodeTitle,
    };
  }
  if (input.pendingLab) {
    return {
      kind: "lab_exercise",
      exerciseSlug: input.pendingLab.exerciseSlug,
      nodeSlug: input.pendingLab.nodeSlug,
      nodeTitle: input.pendingLab.nodeTitle,
    };
  }
  if (input.studyNode && input.modulePublished) {
    return {
      kind: "study_module",
      nodeSlug: input.studyNode.slug,
      nodeTitle: input.studyNode.title,
    };
  }
  if (input.pendingProject) {
    return {
      kind: "project_build",
      projectSlug: input.pendingProject.projectSlug,
      projectTitle: input.pendingProject.title,
      nodeTitle: input.pendingProject.title,
    };
  }
  // Sem módulo para estudar: diagnóstico ajuda a calibrar o mapa.
  if (!input.diagnosisCompleted) return { kind: "diagnosis_needed" };
  if (!input.studyNode) return { kind: "path_complete" };
  return {
    kind: "module_unpublished",
    nodeSlug: input.studyNode.slug,
    nodeTitle: input.studyNode.title,
  };
}

export function hrefForAction(action: NextAction): string {
  switch (action.kind) {
    case "diagnosis_needed":
    case "diagnosis_continue":
      return "/diagnostico";
    case "study_continue":
    case "study_module":
      return `/estudar/${action.nodeSlug}`;
    case "review_due":
      return "/revisar";
    case "lab_exercise":
      return `/lab/${action.exerciseSlug}`;
    case "project_build":
      return `/projeto/${action.projectSlug}`;
    default:
      return "/mapa";
  }
}
