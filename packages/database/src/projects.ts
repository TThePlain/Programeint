import { PrismaClient } from "@prisma/client";

type JavaFile = { path: string; content: string };

const TASK_STARTER = `public class Task {
  private final String title;
  private final boolean done;

  public Task(String title, boolean done) {
    if (title == null || title.isBlank()) {
      throw new IllegalArgumentException("title");
    }
    this.title = title;
    this.done = done;
  }

  public String title() {
    return title;
  }

  public boolean done() {
    return done;
  }
}
`;

const CATALOG_STARTER = `public class Catalog {
  private Task[] tasks = new Task[0];

  public void add(String title) {
    // TODO: acrescentar uma tarefa por fazer
  }

  public void complete(int index) {
    // TODO: marcar a tarefa nesse índice como feita
  }

  public int size() {
    return 0;
  }

  public int pendingCount() {
    return 0;
  }

  public String titles() {
    return "";
  }
}
`;

const CATALOG_HIDDEN = `public class Check {
  public static void main(String[] args) {
    int fails = 0;
    Catalog catalog = new Catalog();
    if (catalog.size() != 0) { System.out.println("FAIL empty size"); fails++; }
    if (catalog.pendingCount() != 0) { System.out.println("FAIL empty pending"); fails++; }
    catalog.add("Ler");
    catalog.add("Codar");
    if (catalog.size() != 2) { System.out.println("FAIL size after add"); fails++; }
    if (catalog.pendingCount() != 2) { System.out.println("FAIL pending after add"); fails++; }
    if (!"Ler\\nCodar".equals(catalog.titles())) { System.out.println("FAIL titles"); fails++; }
    catalog.complete(0);
    if (catalog.pendingCount() != 1) { System.out.println("FAIL pending after complete"); fails++; }
    try {
      catalog.add(" ");
      System.out.println("FAIL blank add");
      fails++;
    } catch (IllegalArgumentException ex) {
      /* esperado */
    }
    if (fails == 0) System.out.println("PASS");
    System.exit(fails == 0 ? 0 : 1);
  }
}
`;

const PROJECTS: Array<{
  slug: string;
  title: string;
  brief: string;
  required: string[];
  sortOrder: number;
  starterFiles: JavaFile[];
  hiddenFiles: JavaFile[];
}> = [
  {
    slug: "java-catalog",
    title: "Catálogo de tarefas em memória",
    required: ["algorithms", "java"],
    sortOrder: 10,
    brief:
      "Constrói um catálogo em memória (array de Task, sem Spring e sem ficheiros). " +
      "`Catalog.add(title)` acrescenta uma tarefa por fazer; `complete(index)` marca-a como feita; " +
      "`size()`, `pendingCount()` e `titles()` (títulos separados por nova linha, pela ordem de inserção) descrevem o estado. " +
      "Título em branco deve lançar IllegalArgumentException. " +
      "Os testes correm numa JVM Docker isolada. Passar não é certificado, nem projeto de produção, nem publicação no GitHub.",
    starterFiles: [
      { path: "Task.java", content: TASK_STARTER },
      { path: "Catalog.java", content: CATALOG_STARTER },
    ],
    hiddenFiles: [{ path: "Check.java", content: CATALOG_HIDDEN }],
  },
];

export async function seedProjects(prisma: PrismaClient) {
  const nodes = await prisma.knowledgeNode.findMany({ select: { id: true, slug: true } });
  const bySlug = new Map(nodes.map((node) => [node.slug, node.id]));

  for (const item of PROJECTS) {
    const requiredIds = item.required
      .map((slug) => bySlug.get(slug))
      .filter((id): id is string => Boolean(id));
    if (requiredIds.length !== item.required.length) continue;

    const project = await prisma.portfolioProject.upsert({
      where: { slug: item.slug },
      create: {
        slug: item.slug,
        title: item.title,
        brief: item.brief,
        language: "java",
        entryClass: "Check",
        starterFiles: item.starterFiles,
        hiddenFiles: item.hiddenFiles,
        published: true,
        sortOrder: item.sortOrder,
      },
      update: {
        title: item.title,
        brief: item.brief,
        starterFiles: item.starterFiles,
        hiddenFiles: item.hiddenFiles,
        published: true,
        sortOrder: item.sortOrder,
        entryClass: "Check",
      },
    });

    await prisma.projectRequirement.deleteMany({ where: { projectId: project.id } });
    await prisma.projectRequirement.createMany({
      data: requiredIds.map((nodeId) => ({ projectId: project.id, nodeId })),
    });
  }
}
