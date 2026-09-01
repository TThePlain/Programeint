export const MAX_DIAGNOSIS_QUESTIONS = 6;

export type MasteryStatus = "unassessed" | "passed" | "failed" | "skipped" | "studied";

export type GraphNode = { id: string; slug: string };
export type GraphPrereq = { nodeId: string; prerequisiteId: string; nature: "required" | "recommended" };

export function requiredPrereqsOf(nodeId: string, prereqs: GraphPrereq[]) {
  return prereqs.filter((item) => item.nodeId === nodeId && item.nature === "required").map((item) => item.prerequisiteId);
}

export function ancestorsAndSelf(targetId: string, prereqs: GraphPrereq[]): Set<string> {
  const result = new Set<string>([targetId]);
  const stack = [targetId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const item of prereqs) {
      // Só arestas required: recommended (git/sql/docker) não saltam à frente na trilha.
      if (
        item.nodeId === current &&
        item.nature === "required" &&
        !result.has(item.prerequisiteId)
      ) {
        result.add(item.prerequisiteId);
        stack.push(item.prerequisiteId);
      }
    }
  }
  return result;
}

export function topologicalOrder(nodeIds: string[], prereqs: GraphPrereq[]): string[] {
  const set = new Set(nodeIds);
  const incoming = new Map<string, number>();
  for (const id of nodeIds) incoming.set(id, 0);
  for (const item of prereqs) {
    if (set.has(item.nodeId) && set.has(item.prerequisiteId) && item.nature === "required") {
      incoming.set(item.nodeId, (incoming.get(item.nodeId) ?? 0) + 1);
    }
  }
  const queue = nodeIds.filter((id) => (incoming.get(id) ?? 0) === 0);
  const ordered: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    ordered.push(id);
    for (const item of prereqs) {
      if (item.prerequisiteId === id && item.nature === "required" && set.has(item.nodeId)) {
        const next = (incoming.get(item.nodeId) ?? 0) - 1;
        incoming.set(item.nodeId, next);
        if (next === 0) queue.push(item.nodeId);
      }
    }
  }
  return ordered;
}

export function pickNextQuestion(input: {
  targetNodeId: string;
  nodes: GraphNode[];
  prereqs: GraphPrereq[];
  mastery: Record<string, MasteryStatus>;
  unusedQuestions: Record<string, string[]>;
  askedCount: number;
  maxQuestions: number;
}): { nodeId: string; questionId: string } | { skipNodeId: string } | null {
  if (input.askedCount >= input.maxQuestions) return null;

  const path = ancestorsAndSelf(input.targetNodeId, input.prereqs);
  const ordered = topologicalOrder([...path], input.prereqs);

  for (const nodeId of ordered) {
    const status = input.mastery[nodeId] ?? "unassessed";
    if (status === "passed" || status === "failed" || status === "skipped") continue;

    const required = requiredPrereqsOf(nodeId, input.prereqs);
    const prereqStatus = (id: string) => input.mastery[id] ?? "unassessed";
    if (required.some((id) => prereqStatus(id) === "failed" || prereqStatus(id) === "skipped")) {
      return { skipNodeId: nodeId };
    }
    if (required.some((id) => prereqStatus(id) === "unassessed")) {
      continue;
    }

    const questionId = input.unusedQuestions[nodeId]?.[0];
    if (questionId) {
      return { nodeId, questionId };
    }
  }

  return null;
}

export function recommendedStart(input: {
  targetNodeId: string;
  prereqs: GraphPrereq[];
  mastery: Record<string, MasteryStatus>;
}): string {
  const path = ancestorsAndSelf(input.targetNodeId, input.prereqs);
  const ordered = topologicalOrder([...path], input.prereqs);
  const failed = ordered.find((id) => input.mastery[id] === "failed");
  if (failed) return failed;
  const unassessed = ordered.find((id) => (input.mastery[id] ?? "unassessed") === "unassessed");
  if (unassessed) return unassessed;
  return input.targetNodeId;
}
