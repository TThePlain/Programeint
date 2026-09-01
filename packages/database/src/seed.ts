import { PrismaClient } from "@prisma/client";
import { seedCurriculum } from "./curriculum";
import { seedLabExercises } from "./lab";
import { seedProjects } from "./projects";
import { seedLibrary } from "./library";

const prisma = new PrismaClient();

async function main() {
  await seedCurriculum(prisma);
  await seedLabExercises(prisma);
  await seedProjects(prisma);
  await seedLibrary(prisma);
  const nodes = await prisma.knowledgeNode.count();
  const questions = await prisma.question.count();
  const modules = await prisma.learningModule.count();
  const labs = await prisma.labExercise.count();
  const projects = await prisma.portfolioProject.count();
  const resources = await prisma.learningResource.count();
  console.log(
    `currículo: ${nodes} nós, ${questions} questões, ${modules} módulos, ${labs} labs, ${projects} projetos, ${resources} recursos`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
