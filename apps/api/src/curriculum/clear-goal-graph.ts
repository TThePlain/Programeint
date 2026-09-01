/**
 * Limpa o grafo gerado de um objectivo na ordem correcta
 * (FKs Restrict em diagnosis/study bloqueiam deleteMany directo).
 */
import type { PrismaClient } from "@prisma/client";

export async function clearGoalGraph(
  prisma: PrismaClient,
  goalId: string,
): Promise<void> {
  const nodes = await prisma.knowledgeNode.findMany({
    where: { goalId },
    select: { id: true },
  });
  const nodeIds = nodes.map((n) => n.id);
  if (nodeIds.length === 0) {
    await prisma.diagnosisSession.deleteMany({ where: { goalId } });
    return;
  }

  const questions = await prisma.question.findMany({
    where: { nodeId: { in: nodeIds } },
    select: { id: true },
  });
  const questionIds = questions.map((q) => q.id);

  await prisma.diagnosisAnswer.deleteMany({
    where: {
      OR: [{ nodeId: { in: nodeIds } }, { session: { goalId } }],
    },
  });
  await prisma.diagnosisSession.deleteMany({ where: { goalId } });

  await prisma.studySession.deleteMany({ where: { nodeId: { in: nodeIds } } });
  if (questionIds.length > 0) {
    await prisma.fsrsCard.deleteMany({ where: { questionId: { in: questionIds } } });
  }

  // Módulos antes das questions (checkQuestion Restrict)
  await prisma.learningModule.deleteMany({ where: { nodeId: { in: nodeIds } } });

  await prisma.question.deleteMany({ where: { nodeId: { in: nodeIds } } });
  await prisma.studyVideo.deleteMany({ where: { nodeId: { in: nodeIds } } });
  await prisma.resourceNode.deleteMany({ where: { nodeId: { in: nodeIds } } });
  await prisma.nodePrerequisite.deleteMany({
    where: {
      OR: [{ nodeId: { in: nodeIds } }, { prerequisiteId: { in: nodeIds } }],
    },
  });
  await prisma.nodeMastery.deleteMany({ where: { nodeId: { in: nodeIds } } });
  await prisma.tutorConversation.deleteMany({ where: { nodeId: { in: nodeIds } } });

  // labs / project requirements: Cascade no schema, mas limpar evita surpresas
  await prisma.labExercise.deleteMany({ where: { nodeId: { in: nodeIds } } });
  await prisma.projectRequirement.deleteMany({ where: { nodeId: { in: nodeIds } } });

  await prisma.knowledgeNode.deleteMany({ where: { goalId } });
}
