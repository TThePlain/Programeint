/** Visual da tecnologia — logos coloridos (skillicons + fallback Devicon). */

const SKILL = "https://skillicons.dev/icons";
const DEVICON = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";

export type TechVisual = {
  slug: string;
  label: string;
  accent: string;
  accentSoft: string;
  /** Ícone principal (skillicons — colorido e nítido). */
  iconUrl: string;
  /** Fallback se o CDN principal falhar. */
  iconFallback: string;
};

function skill(id: string) {
  return `${SKILL}?i=${id}&theme=light`;
}

function dev(path: string) {
  return `${DEVICON}/${path}`;
}

const VISUALS: Record<string, TechVisual> = {
  java: {
    slug: "java",
    label: "Java",
    accent: "#e76f00",
    accentSoft: "#fff4e8",
    iconUrl: skill("java"),
    iconFallback: dev("java/java-original.svg"),
  },
  python: {
    slug: "python",
    label: "Python",
    accent: "#3776ab",
    accentSoft: "#eaf3fa",
    iconUrl: skill("python"),
    iconFallback: dev("python/python-original.svg"),
  },
  javascript: {
    slug: "javascript",
    label: "JavaScript",
    accent: "#f0db4f",
    accentSoft: "#fffbe8",
    iconUrl: skill("js"),
    iconFallback: dev("javascript/javascript-original.svg"),
  },
  typescript: {
    slug: "typescript",
    label: "TypeScript",
    accent: "#3178c6",
    accentSoft: "#eaf2fb",
    iconUrl: skill("ts"),
    iconFallback: dev("typescript/typescript-original.svg"),
  },
  csharp: {
    slug: "csharp",
    label: "C#",
    accent: "#68217a",
    accentSoft: "#f5eaf8",
    iconUrl: skill("cs"),
    iconFallback: dev("csharp/csharp-original.svg"),
  },
  go: {
    slug: "go",
    label: "Go",
    accent: "#00add8",
    accentSoft: "#e6f8fc",
    iconUrl: skill("go"),
    iconFallback: dev("go/go-original.svg"),
  },
  rust: {
    slug: "rust",
    label: "Rust",
    accent: "#dea584",
    accentSoft: "#faf3ec",
    iconUrl: skill("rust"),
    iconFallback: dev("rust/rust-original.svg"),
  },
  kotlin: {
    slug: "kotlin",
    label: "Kotlin",
    accent: "#7f52ff",
    accentSoft: "#f0ebff",
    iconUrl: skill("kotlin"),
    iconFallback: dev("kotlin/kotlin-original.svg"),
  },
  php: {
    slug: "php",
    label: "PHP",
    accent: "#777bb4",
    accentSoft: "#eef0f7",
    iconUrl: skill("php"),
    iconFallback: dev("php/php-original.svg"),
  },
  sql: {
    slug: "sql",
    label: "SQL",
    accent: "#336791",
    accentSoft: "#e9eef5",
    iconUrl: skill("postgres"),
    iconFallback: dev("postgresql/postgresql-original.svg"),
  },
  web: {
    slug: "web",
    label: "HTML / CSS",
    accent: "#e34f26",
    accentSoft: "#feeee9",
    iconUrl: skill("html"),
    iconFallback: dev("html5/html5-original.svg"),
  },
  react: {
    slug: "react",
    label: "React",
    accent: "#61dafb",
    accentSoft: "#eaf9fd",
    iconUrl: skill("react"),
    iconFallback: dev("react/react-original.svg"),
  },
  nodejs: {
    slug: "nodejs",
    label: "Node.js",
    accent: "#3c873a",
    accentSoft: "#eaf6ea",
    iconUrl: skill("nodejs"),
    iconFallback: dev("nodejs/nodejs-original.svg"),
  },
  spring: {
    slug: "spring",
    label: "Spring Boot",
    accent: "#6db33f",
    accentSoft: "#eef7e9",
    iconUrl: skill("spring"),
    iconFallback: dev("spring/spring-original.svg"),
  },
  backend: {
    slug: "backend",
    label: "Backend",
    accent: "#3f5340",
    accentSoft: "#e9efe9",
    iconUrl: skill("nodejs"),
    iconFallback: dev("nodejs/nodejs-original.svg"),
  },
  frontend: {
    slug: "frontend",
    label: "Frontend",
    accent: "#db7093",
    accentSoft: "#fdf0f5",
    iconUrl: skill("css"),
    iconFallback: dev("css3/css3-original.svg"),
  },
  fullstack: {
    slug: "fullstack",
    label: "Full-stack",
    accent: "#2f6fed",
    accentSoft: "#eaf1fd",
    iconUrl: skill("js"),
    iconFallback: dev("javascript/javascript-original.svg"),
  },
  mobile: {
    slug: "mobile",
    label: "Mobile",
    accent: "#3ddc84",
    accentSoft: "#e9fbf1",
    iconUrl: skill("androidstudio"),
    iconFallback: dev("android/android-original.svg"),
  },
  algorithms: {
    slug: "algorithms",
    label: "Algoritmos",
    accent: "#4a5568",
    accentSoft: "#eef0f3",
    iconUrl: skill("cpp"),
    iconFallback: dev("cplusplus/cplusplus-original.svg"),
  },
  databases: {
    slug: "databases",
    label: "Bases de dados",
    accent: "#336791",
    accentSoft: "#e9eef5",
    iconUrl: skill("mysql"),
    iconFallback: dev("mysql/mysql-original.svg"),
  },
  oop: {
    slug: "oop",
    label: "POO",
    accent: "#5b6ee1",
    accentSoft: "#eef0fc",
    iconUrl: skill("java"),
    iconFallback: dev("java/java-original.svg"),
  },
  git: {
    slug: "git",
    label: "Git",
    accent: "#f05033",
    accentSoft: "#feeeea",
    iconUrl: skill("git"),
    iconFallback: dev("git/git-original.svg"),
  },
  docker: {
    slug: "docker",
    label: "Docker",
    accent: "#2496ed",
    accentSoft: "#e8f4fd",
    iconUrl: skill("docker"),
    iconFallback: dev("docker/docker-original.svg"),
  },
  linux: {
    slug: "linux",
    label: "Linux",
    accent: "#e95420",
    accentSoft: "#fef0e9",
    iconUrl: skill("linux"),
    iconFallback: dev("linux/linux-original.svg"),
  },
  testing: {
    slug: "testing",
    label: "Testes",
    accent: "#6c63ff",
    accentSoft: "#efeeff",
    iconUrl: skill("jest"),
    iconFallback: dev("jest/jest-plain.svg"),
  },
  devops: {
    slug: "devops",
    label: "DevOps",
    accent: "#326ce5",
    accentSoft: "#eaf1fc",
    iconUrl: skill("kubernetes"),
    iconFallback: dev("kubernetes/kubernetes-original.svg"),
  },
  cloud: {
    slug: "cloud",
    label: "Cloud",
    accent: "#ff9900",
    accentSoft: "#fff6e8",
    iconUrl: skill("aws"),
    iconFallback: dev("amazonwebservices/amazonwebservices-plain-wordmark.svg"),
  },
  data: {
    slug: "data",
    label: "Data Science",
    accent: "#00a3a1",
    accentSoft: "#e6f7f7",
    iconUrl: skill("python"),
    iconFallback: dev("python/python-original.svg"),
  },
  ml: {
    slug: "ml",
    label: "Machine Learning",
    accent: "#ff6f61",
    accentSoft: "#ffefed",
    iconUrl: skill("tensorflow"),
    iconFallback: dev("tensorflow/tensorflow-original.svg"),
  },
  ai: {
    slug: "ai",
    label: "IA aplicada",
    accent: "#7c5cff",
    accentSoft: "#f0ebff",
    iconUrl: skill("pytorch"),
    iconFallback: dev("pytorch/pytorch-original.svg"),
  },
  security: {
    slug: "security",
    label: "Cibersegurança",
    accent: "#c0392b",
    accentSoft: "#fcebe9",
    iconUrl: skill("linux"),
    iconFallback: dev("linux/linux-original.svg"),
  },
  architecture: {
    slug: "architecture",
    label: "Arquitectura",
    accent: "#34495e",
    accentSoft: "#ebeef1",
    iconUrl: skill("graphql"),
    iconFallback: dev("graphql/graphql-plain.svg"),
  },
  design: {
    slug: "design",
    label: "UI / UX",
    accent: "#ff2d55",
    accentSoft: "#ffe9ee",
    iconUrl: skill("figma"),
    iconFallback: dev("figma/figma-original.svg"),
  },
  custom: {
    slug: "custom",
    label: "Tech",
    accent: "#3f5340",
    accentSoft: "#e9efe9",
    iconUrl: skill("vscode"),
    iconFallback: dev("vscode/vscode-original.svg"),
  },
};

export function resolveTechVisual(
  slug?: string | null,
  label?: string | null,
  statement?: string | null,
): TechVisual {
  const key = (slug ?? "").toLowerCase();
  if (VISUALS[key]) return VISUALS[key]!;

  const hay = `${label ?? ""} ${statement ?? ""}`.toLowerCase();
  const hints: Array<[RegExp, string]> = [
    [/\bjava\b|spring/, "java"],
    [/\bpython\b|django|fastapi/, "python"],
    [/\btypescript\b|\bts\b/, "typescript"],
    [/\bjavascript\b|\bjs\b|node/, "javascript"],
    [/\breact\b/, "react"],
    [/\bdocker\b/, "docker"],
    [/\bgit\b/, "git"],
    [/\bsql\b|postgres|mysql/, "sql"],
    [/\brust\b/, "rust"],
    [/\bkotlin\b/, "kotlin"],
    [/\bgo\b|golang/, "go"],
    [/\bc#|csharp|\.net/, "csharp"],
  ];
  for (const [re, id] of hints) {
    if (re.test(hay) && VISUALS[id]) return VISUALS[id]!;
  }
  return {
    ...VISUALS.custom!,
    label: label?.trim() || "Objectivo tech",
  };
}
