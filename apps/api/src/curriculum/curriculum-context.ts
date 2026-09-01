import { NotFoundException } from "@nestjs/common";
import { GOAL_SLUG_TO_NODE } from "@programeint/database";
import type { PrismaService } from "../prisma/prisma.service";

export type CurriculumContext =
  | {
      available: true;
      targetNode: { id: string; slug: string; title: string; summary: string; area: string; sortOrder: number };
      goal: {
        id: string;
        statement: string;
        tipNodeSlug: string | null;
        curriculumStatus: string;
        curriculumSource: string | null;
        curriculumScope: string | null;
        curriculumNote: string | null;
        isCurrent: boolean;
        targets: Array<{ slug: string; label: string; isPrimary: boolean }>;
      };
      /** null = grafo seed Java (global); string = nós só deste objectivo */
      scopeGoalId: string | null;
    }
  | { available: false; message: string; generating?: boolean };

/** Objectivo em foco do aluno (isCurrent) — nunca mistura com outros. */
export async function findCurrentGoal(prisma: PrismaService, userId: string) {
  const current = await prisma.goal.findFirst({
    where: { userId, status: "active", isCurrent: true },
    include: { targets: true },
  });
  if (current) return current;

  // Migração / legado: primeiro activo, e marca-o como actual
  const fallback = await prisma.goal.findFirst({
    where: { userId, status: "active" },
    include: { targets: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!fallback) return null;

  await prisma.goal.updateMany({ where: { userId }, data: { isCurrent: false } });
  return prisma.goal.update({
    where: { id: fallback.id },
    data: { isCurrent: true },
    include: { targets: true },
  });
}

/** Resolve tip do objectivo actual (seed Java ou currículo gerado). */
export async function resolveCurriculumContext(
  prisma: PrismaService,
  userId: string,
): Promise<CurriculumContext> {
  const goal = await findCurrentGoal(prisma, userId);
  if (!goal) {
    return { available: false, message: "Define um objetivo antes de estudar." };
  }

  if (goal.curriculumStatus === "generating") {
    return {
      available: false,
      generating: true,
      message: "A gerar o teu mapa de estudo a partir do objectivo (pesquisa + conteúdos)…",
    };
  }

  if (goal.curriculumStatus === "failed") {
    return {
      available: false,
      message:
        goal.curriculumNote ||
        "Não foi possível gerar o currículo. Volta ao onboarding e grava o objectivo outra vez.",
    };
  }

  let tipSlug: string | null = goal.tipNodeSlug;
  if (!tipSlug) {
    const primary = goal.targets.find((item) => item.isPrimary)?.slug;
    tipSlug = primary ? (GOAL_SLUG_TO_NODE[primary] ?? null) : null;
  }

  if (!tipSlug) {
    return {
      available: false,
      message:
        "Ainda não há mapa para este objectivo. Grava o onboarding para pesquisar e gerar o currículo.",
    };
  }

  const targetNode = await prisma.knowledgeNode.findUnique({ where: { slug: tipSlug } });
  if (!targetNode) {
    return {
      available: false,
      message: tipSlug.startsWith("g-")
        ? "Currículo gerado em falta. Volta a gravar o objectivo."
        : "Currículo em falta. Corre pnpm db:seed.",
    };
  }

  // Isolamento: tip gerado tem de pertencer a ESTE goal
  if (targetNode.goalId && targetNode.goalId !== goal.id) {
    return {
      available: false,
      message: "O mapa deste objectivo não corresponde ao tip guardado. Volta a gerar o objectivo.",
    };
  }

  return {
    available: true,
    targetNode,
    goal,
    scopeGoalId: targetNode.goalId ?? null,
  };
}

export async function loadScopedGraph(
  prisma: PrismaService,
  scopeGoalId: string | null,
) {
  const [nodes, prereqs] = await Promise.all([
    prisma.knowledgeNode.findMany({
      where: scopeGoalId ? { goalId: scopeGoalId } : { goalId: null },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.nodePrerequisite.findMany({
      where: scopeGoalId
        ? { node: { goalId: scopeGoalId } }
        : { node: { goalId: null } },
    }),
  ]);
  return {
    nodes,
    prereqs: prereqs.map((item) => ({
      nodeId: item.nodeId,
      prerequisiteId: item.prerequisiteId,
      nature: item.nature as "required" | "recommended",
    })),
  };
}

/** IDs dos nós do objectivo actual — para evolução / mastery sem misturar. */
export async function scopedNodeIds(
  prisma: PrismaService,
  userId: string,
): Promise<{ goalId: string; nodeIds: string[]; scopeGoalId: string | null } | null> {
  const ctx = await resolveCurriculumContext(prisma, userId);
  if (!ctx.available) return null;
  const graph = await loadScopedGraph(prisma, ctx.scopeGoalId);
  return {
    goalId: ctx.goal.id,
    nodeIds: graph.nodes.map((node) => node.id),
    scopeGoalId: ctx.scopeGoalId,
  };
}

/** Garante que o nó pertence ao plano do objectivo actual do aluno. */
export async function assertNodeInUserScope(
  prisma: PrismaService,
  userId: string,
  nodeId: string,
): Promise<void> {
  const scope = await scopedNodeIds(prisma, userId);
  if (!scope || !scope.nodeIds.includes(nodeId)) {
    throw new NotFoundException("Conteúdo fora do teu plano de estudo.");
  }
}
