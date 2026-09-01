import type { PrismaClient } from "@prisma/client";
import { resourceIsListable, type ResourceCandidate } from "@programeint/shared";

/**
 * Catálogo curado. Só entram fontes do próprio editor, com licença conhecida.
 * A biblioteca liga ao original; nunca guarda nem serve cópias do conteúdo.
 *
 * `nodes` — slugs do grafo global (seed Java).
 * `matchKeys` — chaves de nós gerados (fundamentos, tip, …) ou palavras no título.
 * `matchGoals` — slugs de onboarding (python, web, custom, …).
 */
export const RESOURCES: Array<
  ResourceCandidate & {
    slug: string;
    publisher: string;
    language: string;
    summary: string;
    nodes: string[];
    matchKeys?: string[];
    matchGoals?: string[];
  }
> = [
  {
    slug: "openjdk",
    title: "OpenJDK",
    url: "https://openjdk.org/",
    publisher: "OpenJDK",
    kind: "docs",
    license: "GPL-2.0-with-classpath-exception",
    language: "en",
    official: true,
    summary: "Implementação de referência do Java: JDK, JEPs e notas de cada versão.",
    nodes: ["java"],
    matchKeys: ["java", "fundamentos", "conceitos-core", "tip"],
    matchGoals: ["java"],
  },
  {
    slug: "wikibooks-java",
    title: "Java Programming (Wikibooks)",
    url: "https://en.wikibooks.org/wiki/Java_Programming",
    publisher: "Wikibooks",
    kind: "book",
    license: "CC-BY-SA-4.0",
    language: "en",
    official: true,
    summary: "Livro aberto de Java, da sintaxe a classes e coleções.",
    nodes: ["java", "oop", "java-collections", "java-exceptions"],
    matchKeys: ["java", "oop", "collections", "exceptions", "pratica-guiada"],
    matchGoals: ["java"],
  },
  {
    slug: "junit5-user-guide",
    title: "JUnit 5 User Guide",
    url: "https://junit.org/junit5/docs/current/user-guide/",
    publisher: "JUnit Team",
    kind: "docs",
    license: "EPL-2.0",
    language: "en",
    official: true,
    summary: "Escrever e correr testes em Java: asserções, ciclo de vida e execução.",
    nodes: ["testing", "java"],
    matchKeys: ["testing", "testes", "pratica-guiada", "padroes"],
    matchGoals: ["java"],
  },
  {
    slug: "spring-framework-reference",
    title: "Spring Framework Reference",
    url: "https://docs.spring.io/spring-framework/reference/",
    publisher: "VMware Tanzu",
    kind: "docs",
    license: "Apache-2.0",
    language: "en",
    official: true,
    summary: "Contentor, injeção de dependências e o modelo de programação do Spring.",
    nodes: ["spring"],
    matchKeys: ["spring", "padroes", "projecto"],
    matchGoals: ["java"],
  },
  {
    slug: "spring-boot-reference",
    title: "Spring Boot Reference",
    url: "https://docs.spring.io/spring-boot/",
    publisher: "VMware Tanzu",
    kind: "docs",
    license: "Apache-2.0",
    language: "en",
    official: true,
    summary: "Aplicações executáveis, auto-configuração, starters e propriedades.",
    nodes: ["spring-boot", "spring"],
    matchKeys: ["spring", "boot", "projecto", "tip"],
    matchGoals: ["java"],
  },
  {
    slug: "mdn-http",
    title: "HTTP (MDN Web Docs)",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP",
    publisher: "Mozilla",
    kind: "docs",
    license: "CC-BY-SA-2.5",
    language: "en",
    official: true,
    summary: "Métodos, códigos de estado e cabeçalhos — a base de qualquer API REST.",
    nodes: ["rest"],
    matchKeys: ["rest", "http", "api", "web", "conceitos-core"],
    matchGoals: ["web", "javascript", "typescript", "java", "python", "custom"],
  },
  {
    slug: "mdn-html",
    title: "HTML (MDN Web Docs)",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML",
    publisher: "Mozilla",
    kind: "docs",
    license: "CC-BY-SA-2.5",
    language: "en",
    official: true,
    summary: "Elementos, formulários e estrutura de páginas — referência oficial do HTML.",
    nodes: [],
    matchKeys: ["html", "web", "fundamentos", "frontend"],
    matchGoals: ["web", "javascript", "typescript"],
  },
  {
    slug: "mdn-css",
    title: "CSS (MDN Web Docs)",
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS",
    publisher: "Mozilla",
    kind: "docs",
    license: "CC-BY-SA-2.5",
    language: "en",
    official: true,
    summary: "Selectores, layout e tipografia — documentação oficial do CSS.",
    nodes: [],
    matchKeys: ["css", "web", "estilo", "frontend"],
    matchGoals: ["web", "javascript", "typescript"],
  },
  {
    slug: "mdn-javascript",
    title: "JavaScript (MDN Web Docs)",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    publisher: "Mozilla",
    kind: "docs",
    license: "CC-BY-SA-2.5",
    language: "en",
    official: true,
    summary: "Linguagem, APIs do browser e guia de referência do JavaScript.",
    nodes: [],
    matchKeys: ["javascript", "js", "fundamentos", "conceitos-core", "tip"],
    matchGoals: ["javascript", "typescript", "web"],
  },
  {
    slug: "typescript-handbook",
    title: "TypeScript Handbook",
    url: "https://www.typescriptlang.org/docs/handbook/intro.html",
    publisher: "Microsoft",
    kind: "docs",
    license: "Apache-2.0",
    language: "en",
    official: true,
    summary: "Tipos, configuração e o modelo de programação do TypeScript.",
    nodes: [],
    matchKeys: ["typescript", "ts", "tipos", "fundamentos", "tip"],
    matchGoals: ["typescript", "javascript"],
  },
  {
    slug: "python-docs",
    title: "Python Documentation",
    url: "https://docs.python.org/3/",
    publisher: "Python Software Foundation",
    kind: "docs",
    license: "PSF-2.0",
    language: "en",
    official: true,
    summary: "Tutorial, library reference e linguagem — documentação oficial do Python.",
    nodes: [],
    matchKeys: ["python", "fundamentos", "conceitos-core", "tip"],
    matchGoals: ["python", "data", "ml", "ai"],
  },
  {
    slug: "postgresql-docs",
    title: "Documentação do PostgreSQL",
    url: "https://www.postgresql.org/docs/",
    publisher: "PostgreSQL Global Development Group",
    kind: "docs",
    license: "PostgreSQL",
    language: "en",
    official: true,
    summary: "SQL, modelo relacional, índices e transações na fonte oficial.",
    nodes: ["sql"],
    matchKeys: ["sql", "database", "dados", "ferramentas"],
    matchGoals: ["sql", "data", "java", "python", "custom"],
  },
  {
    slug: "pro-git",
    title: "Pro Git",
    url: "https://git-scm.com/book/en/v2",
    publisher: "Scott Chacon, Ben Straub",
    kind: "book",
    license: "CC-BY-NC-SA-3.0",
    language: "en",
    official: true,
    summary: "Livro oficial do Git: commits, branches e histórico, do básico ao interno.",
    nodes: ["git"],
    matchKeys: ["git", "github", "ferramentas", "version"],
    matchGoals: ["git", "devops", "java", "python", "javascript", "typescript", "custom"],
  },
  {
    slug: "docker-docs",
    title: "Docker Docs",
    url: "https://docs.docker.com/",
    publisher: "Docker Inc.",
    kind: "docs",
    license: "Apache-2.0",
    language: "en",
    official: true,
    summary: "Imagens, contentores, volumes e redes na documentação do próprio Docker.",
    nodes: ["docker"],
    matchKeys: ["docker", "container", "ferramentas", "devops"],
    matchGoals: ["docker", "devops", "cloud", "java", "custom"],
  },
  {
    slug: "go-docs",
    title: "The Go Programming Language",
    url: "https://go.dev/doc/",
    publisher: "Go Team / Google",
    kind: "docs",
    license: "CC-BY-4.0",
    language: "en",
    official: true,
    summary: "Tour, especificação e pacotes — documentação oficial de Go.",
    nodes: [],
    matchKeys: ["go", "golang", "fundamentos", "tip"],
    matchGoals: ["go"],
  },
  {
    slug: "rust-book",
    title: "The Rust Programming Language",
    url: "https://doc.rust-lang.org/book/",
    publisher: "Rust Project",
    kind: "book",
    license: "Apache-2.0",
    language: "en",
    official: true,
    summary: "O livro oficial de Rust: ownership, tipos e o ecossistema.",
    nodes: [],
    matchKeys: ["rust", "fundamentos", "conceitos-core", "tip"],
    matchGoals: ["rust"],
  },
  {
    slug: "kotlin-docs",
    title: "Kotlin Docs",
    url: "https://kotlinlang.org/docs/home.html",
    publisher: "JetBrains",
    kind: "docs",
    license: "Apache-2.0",
    language: "en",
    official: true,
    summary: "Linguagem, coroutines e multiplataforma — documentação oficial Kotlin.",
    nodes: [],
    matchKeys: ["kotlin", "fundamentos", "tip"],
    matchGoals: ["kotlin"],
  },
  {
    slug: "owasp-top10",
    title: "OWASP Top 10",
    url: "https://owasp.org/www-project-top-ten/",
    publisher: "OWASP",
    kind: "docs",
    license: "CC-BY-SA-4.0",
    language: "en",
    official: true,
    summary: "Os riscos de segurança mais críticos em aplicações web.",
    nodes: [],
    matchKeys: ["security", "seguranca", "owasp", "padroes", "tip"],
    matchGoals: ["security", "web", "custom"],
  },
];

export function resourceMatchesContext(
  resource: (typeof RESOURCES)[number],
  ctx: { goalSlug?: string | null; nodeKey?: string | null; haystack?: string },
): boolean {
  const goal = (ctx.goalSlug ?? "").toLowerCase();
  const key = (ctx.nodeKey ?? "").toLowerCase();
  const hay = (ctx.haystack ?? "").toLowerCase();
  const genericGoal = !goal || goal === "custom" || goal === "outro" || goal === "other";

  // Objectivo genérico: só por chave/tópico no texto — nunca só por matchGoals "custom"
  if (!genericGoal && resource.matchGoals?.some((g) => g.toLowerCase() === goal)) return true;
  if (key && resource.matchKeys?.some((k) => key.includes(k.toLowerCase()) || k.toLowerCase() === key))
    return true;
  if (hay && resource.matchKeys?.some((k) => hay.includes(k.toLowerCase()))) return true;
  if (key && resource.nodes.some((n) => key.includes(n) || n === key)) return true;
  return false;
}

export async function seedLibrary(prisma: PrismaClient) {
  const nodes = await prisma.knowledgeNode.findMany({
    where: { goalId: null },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(nodes.map((node) => [node.slug, node.id]));

  for (const item of RESOURCES) {
    if (!resourceIsListable(item)) {
      throw new Error(`recurso recusado pela política da biblioteca: ${item.slug}`);
    }

    const resource = await prisma.learningResource.upsert({
      where: { slug: item.slug },
      create: {
        slug: item.slug,
        title: item.title,
        url: item.url,
        publisher: item.publisher,
        kind: item.kind,
        license: item.license,
        language: item.language,
        summary: item.summary,
        official: item.official,
        published: true,
      },
      update: {
        title: item.title,
        url: item.url,
        publisher: item.publisher,
        kind: item.kind,
        license: item.license,
        language: item.language,
        summary: item.summary,
        official: item.official,
        published: true,
      },
    });

    // Religações ao grafo global (Java seed) — não apaga ligações a nós gerados.
    const globalNodeIds = item.nodes
      .map((slug) => bySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    if (globalNodeIds.length > 0) {
      await prisma.resourceNode.deleteMany({
        where: { resourceId: resource.id, node: { goalId: null } },
      });
      await prisma.resourceNode.createMany({
        data: globalNodeIds.map((nodeId) => ({ resourceId: resource.id, nodeId })),
        skipDuplicates: true,
      });
    }
  }
}
