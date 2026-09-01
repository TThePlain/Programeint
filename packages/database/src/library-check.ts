import { PrismaClient } from "@prisma/client";

/**
 * Verifica que cada link do catálogo continua a responder e grava o resultado.
 * Link partido é estado real: fica registado em vez de desaparecer em silêncio.
 */
const prisma = new PrismaClient();
const TIMEOUT_MS = 15_000;

async function probe(url: string): Promise<number> {
  const attempt = async (method: "HEAD" | "GET") => {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "programeint-library-check" },
    });
    return response.status;
  };

  try {
    const status = await attempt("HEAD");
    // Alguns editores não respondem a HEAD; confirmamos com GET antes de marcar falha.
    return status === 405 || status === 403 ? await attempt("GET") : status;
  } catch {
    try {
      return await attempt("GET");
    } catch {
      return 0;
    }
  }
}

async function main() {
  const resources = await prisma.learningResource.findMany({
    where: { published: true },
    orderBy: { slug: "asc" },
  });

  let broken = 0;
  for (const resource of resources) {
    const status = await probe(resource.url);
    const ok = status >= 200 && status < 400;
    if (!ok) broken += 1;
    await prisma.learningResource.update({
      where: { id: resource.id },
      data: { lastCheckedAt: new Date(), lastStatus: status },
    });
    console.log(`${ok ? "ok  " : "FALHA"} ${String(status).padStart(3)} ${resource.slug} ${resource.url}`);
  }

  console.log(`\n${resources.length - broken}/${resources.length} links acessíveis`);
  if (broken > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
