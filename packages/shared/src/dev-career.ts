/**
 * Carreira de desenvolvedor / programador.
 * Não é só a linguagem: stack complementar, full-stack, soft skills e realidade do trabalho.
 */

export type DevCareerTool = {
  name: string;
  why: string;
};

export type DevCareerProfile = {
  slug: string;
  /** Papel típico (ex.: Backend Java / Full-stack). */
  roleTitle: string;
  /** Tipo de carreira em uma frase. */
  careerType: string;
  /** O que a pessoa faz no dia-a-dia (além de «escrever código»). */
  whatYouDo: string[];
  /** Como é ser nesta área. */
  whatItsLike: string;
  /** Reuniões e rituais típicos. */
  meetings: Array<{ name: string; purpose: string }>;
  /** Soft skills essenciais nesta matéria. */
  softSkills: Array<{ name: string; how: string }>;
  /** Framework / ecossistema principal (ex. Spring Boot). */
  coreFramework: DevCareerTool;
  /** Materiais e ferramentas complementares para formar full-stack / perfil empregável. */
  complementary: DevCareerTool[];
  /** Camada full-stack sugerida a partir desta linguagem. */
  fullStackPath: Array<{ layer: string; items: string; why: string }>;
  /** Ferramentas do ofício (IDE, Git, CI…). */
  workTools: DevCareerTool[];
  /** Queries de pesquisa / vídeo para nós de carreira. */
  researchHints: {
    framework: string;
    fullstack: string;
    softSkills: string;
    dayInLife: string;
  };
};

const COMMON_MEETINGS: DevCareerProfile["meetings"] = [
  {
    name: "Daily / stand-up",
    purpose: "2–3 minutos: ontem, hoje, bloqueios. Não é relatório longo.",
  },
  {
    name: "Sprint planning",
    purpose: "Escolher trabalho da sprint com estimativa e critérios de aceitação.",
  },
  {
    name: "Refinamento / backlog",
    purpose: "Clarificar tickets com produto antes de programar às cegas.",
  },
  {
    name: "Code review",
    purpose: "Ler PRs de colegas; pedir e dar feedback técnico sem ser pessoal.",
  },
  {
    name: "Retro / 1:1",
    purpose: "Melhorar o processo da equipa e o teu crescimento — não só features.",
  },
];

const COMMON_SOFT: DevCareerProfile["softSkills"] = [
  {
    name: "Comunicação escrita",
    how: "Tickets claros, PRs com contexto, mensagens no chat sem ambiguidade.",
  },
  {
    name: "Explicar trade-offs",
    how: "Dizer o que dá para entregar agora vs depois, em linguagem de negócio.",
  },
  {
    name: "Colaboração em PR",
    how: "Rever código com respeito; aceitar feedback sem defensiva.",
  },
  {
    name: "Gestão de tempo / foco",
    how: "Protege blocos de deep work; reuniões não podem comer o dia todo.",
  },
  {
    name: "Debugging e paciência",
    how: "Hipótese → teste → iterar. Grande parte do trabalho é investigar, não «inventar código novo».",
  },
  {
    name: "Documentação mínima",
    how: "Deixar o próximo (ou o teu «eu» daqui a 3 meses) perceber o porquê.",
  },
];

const COMMON_WORK_TOOLS: DevCareerTool[] = [
  { name: "Git + GitHub/GitLab", why: "Histórico, branches, PRs — o trabalho real passa por aqui." },
  { name: "IDE / editor", why: "Debugger, refactor e testes locais — produtividade do dia." },
  { name: "Issue tracker (Jira, Linear…)", why: "O trabalho chega em tickets, não em «faz aí uma app»." },
  { name: "CI/CD", why: "Testes e deploy automáticos; «funciona na minha máquina» não chega." },
];

function profile(partial: DevCareerProfile): DevCareerProfile {
  return {
    ...partial,
    meetings: partial.meetings.length ? partial.meetings : COMMON_MEETINGS,
    softSkills: partial.softSkills.length ? partial.softSkills : COMMON_SOFT,
    workTools: [...partial.workTools, ...COMMON_WORK_TOOLS.filter((t) => !partial.workTools.some((p) => p.name === t.name))],
  };
}

/** Perfis por linguagem / área tech do catálogo. */
export const DEV_CAREER_PROFILES: Record<string, DevCareerProfile> = {
  java: profile({
    slug: "java",
    roleTitle: "Desenvolvedor Backend Java (caminho a Full-stack)",
    careerType: "Engenharia de software — backend / APIs / sistemas empresariais",
    whatYouDo: [
      "Ler requisitos e tickets; clarificar dúvidas com produto antes de codar",
      "Implementar e alterar APIs, regras de negócio e persistência",
      "Escrever e correr testes; depurar falhas em staging/produção",
      "Fazer e receber code review; documentar decisões curtas",
      "Participar em stand-ups, planning e refinamentos",
      "Manter sistemas existentes (muitas vezes mais tempo que features novas)",
    ],
    whatItsLike:
      "Ser desenvolvedor Java não é «só escrever classes». Grande parte do dia é ler código alheio, depurar, reunir-te 10–15 min no stand-up, discutir desenhos e entregar evidência em PRs. O código novo costuma ser 3–5 h de foco; o resto é colaboração e manutenção.",
    meetings: COMMON_MEETINGS,
    softSkills: COMMON_SOFT,
    coreFramework: {
      name: "Spring Boot",
      why: "Ecossistema padrão para APIs e serviços Java em empresas (starters, config, Actuator).",
    },
    complementary: [
      { name: "Spring / IoC", why: "Base do Boot: beans, injecção, contentor." },
      { name: "REST + HTTP", why: "Contratos de API que o frontend e outros serviços consomem." },
      { name: "SQL + JPA/Hibernate", why: "Dados relacionais — quase todo backend Java toca BD." },
      { name: "Testes (JUnit)", why: "Evidência de que a regra de negócio não partiu." },
      { name: "Docker", why: "Correr a app e dependências como em produção." },
      { name: "Maven ou Gradle", why: "Build e dependências do projecto." },
    ],
    fullStackPath: [
      {
        layer: "Backend",
        items: "Java · Spring Boot · REST · testes",
        why: "O teu núcleo: APIs e regras de negócio.",
      },
      {
        layer: "Dados",
        items: "SQL · modelagem · transações",
        why: "Sem dados bem modelados o backend não serve o produto.",
      },
      {
        layer: "Frontend complementar",
        items: "HTML/CSS · JS ou TypeScript · React (básico)",
        why: "Full-stack = consegues falar com UI e fechar um fluxo ponta a ponta.",
      },
      {
        layer: "Entrega",
        items: "Git · CI · Docker",
        why: "Código só conta quando chega com segurança ao ambiente partilhado.",
      },
    ],
    workTools: [
      { name: "IntelliJ IDEA / VS Code", why: "Debugger e navegação em projectos grandes." },
      { name: "Postman / Insomnia", why: "Testar APIs sem UI." },
    ],
    researchHints: {
      framework: "Spring Boot REST API tutorial",
      fullstack: "Java full stack Spring Boot React",
      softSkills: "software engineer soft skills code review meetings",
      dayInLife: "day in the life java backend developer",
    },
  }),

  python: profile({
    slug: "python",
    roleTitle: "Desenvolvedor Python (Backend / Full-stack / dados)",
    careerType: "Engenharia de software — APIs, automação, dados aplicados",
    whatYouDo: [
      "Construir APIs ou scripts que resolvem problemas de produto/dados",
      "Testar, depurar e rever código em PRs",
      "Falar com stakeholders sobre o que é viável tecnicamente",
      "Documentar e manter o que já existe",
    ],
    whatItsLike:
      "Python aparece em backend, automação e dados. O dia mistura código, notebooks/scripts, reuniões curtas e muita leitura de logs e issues. Soft skills (explicar, priorizar) pesam tanto como a sintaxe.",
    meetings: COMMON_MEETINGS,
    softSkills: COMMON_SOFT,
    coreFramework: {
      name: "FastAPI ou Django",
      why: "APIs e apps web maduras no ecossistema Python.",
    },
    complementary: [
      { name: "SQL / pandas (conforme foco)", why: "Dados são o pão-de-cada-dia em muitos papéis Python." },
      { name: "pytest", why: "Testes como evidência." },
      { name: "Docker", why: "Ambientes reproduzíveis." },
      { name: "Git", why: "Colaboração e histórico." },
      { name: "Type hints + lint", why: "Código legível em equipa." },
    ],
    fullStackPath: [
      { layer: "Backend", items: "Python · FastAPI/Django · REST", why: "Núcleo do serviço." },
      { layer: "Dados", items: "SQL · modelos · ETL leve", why: "Python brilha a transformar dados." },
      { layer: "Frontend complementar", items: "HTML · JS/TS · template ou React", why: "Fechar fluxos full-stack." },
      { layer: "Entrega", items: "Git · CI · Docker", why: "Deploy e qualidade." },
    ],
    workTools: [{ name: "VS Code / PyCharm", why: "Debug e ambiente virtual." }],
    researchHints: {
      framework: "FastAPI Django REST tutorial",
      fullstack: "Python full stack Django React",
      softSkills: "python developer soft skills teamwork",
      dayInLife: "day in the life python developer",
    },
  }),

  javascript: profile({
    slug: "javascript",
    roleTitle: "Desenvolvedor JavaScript (caminho Full-stack)",
    careerType: "Engenharia de software — web frontend e full-stack",
    whatYouDo: [
      "Implementar interfaces e/ou APIs Node",
      "Rever PRs, discutir UX com design, alinhar com produto",
      "Debug no browser e no servidor; corrigir regressões",
      "Participar em stand-ups e planning",
    ],
    whatItsLike:
      "JS é a língua da web. O trabalho real inclui muito browser DevTools, acessibilidade, performance e comunicação com design — não só «saber a sintaxe».",
    meetings: COMMON_MEETINGS,
    softSkills: COMMON_SOFT,
    coreFramework: {
      name: "Node.js + Express (ou Nest) / React",
      why: "Backend leve + UI moderna — perfil full-stack clássico.",
    },
    complementary: [
      { name: "HTML / CSS acessível", why: "UI sem base sólida parte em produção." },
      { name: "TypeScript (recomendado)", why: "Equipas sérias tipam o JS." },
      { name: "SQL ou Mongo", why: "Persistência do produto." },
      { name: "Testes (Jest/Vitest)", why: "Evidência em PRs." },
      { name: "Git + CI", why: "Entrega em equipa." },
    ],
    fullStackPath: [
      { layer: "Frontend", items: "JS · React · CSS", why: "Experiência do utilizador." },
      { layer: "Backend", items: "Node · Express/Nest · REST", why: "APIs do produto." },
      { layer: "Dados", items: "SQL ou document DB", why: "Estado persistente." },
      { layer: "Entrega", items: "Git · CI · hosting", why: "Ir a produção." },
    ],
    workTools: [{ name: "VS Code + DevTools", why: "Debug no browser é o ofício." }],
    researchHints: {
      framework: "Node Express React full stack tutorial",
      fullstack: "JavaScript full stack developer roadmap",
      softSkills: "frontend developer soft skills collaboration",
      dayInLife: "day in the life javascript developer",
    },
  }),

  typescript: profile({
    slug: "typescript",
    roleTitle: "Desenvolvedor TypeScript Full-stack",
    careerType: "Engenharia de software — web tipada ponta a ponta",
    whatYouDo: [
      "Desenhar tipos e contratos partilhados frontend/backend",
      "Implementar features com testes e review",
      "Alinhar com produto e design em reuniões curtas",
    ],
    whatItsLike:
      "TypeScript é JS com disciplina de equipa. O valor está em contratos claros, menos bugs em produção e melhor colaboração — não em «decorar tipos».",
    meetings: COMMON_MEETINGS,
    softSkills: COMMON_SOFT,
    coreFramework: {
      name: "Next.js / NestJS (conforme foco)",
      why: "Ecossistema TS maduro para full-stack e APIs.",
    },
    complementary: [
      { name: "React + hooks", why: "UI moderna tipada." },
      { name: "Node + REST/tRPC", why: "Backend no mesmo idioma." },
      { name: "SQL / Prisma", why: "Dados com tipos." },
      { name: "Testes + CI", why: "Qualidade de entrega." },
      { name: "Docker", why: "Ambientes iguais." },
    ],
    fullStackPath: [
      { layer: "Frontend", items: "TS · React · Next", why: "Produto visível." },
      { layer: "Backend", items: "TS · Nest/Node · API", why: "Regras e integração." },
      { layer: "Dados", items: "SQL · ORM tipado", why: "Persistência segura." },
      { layer: "Entrega", items: "Git · CI · Docker", why: "Pipeline profissional." },
    ],
    workTools: [{ name: "VS Code", why: "Language service TS é o dia-a-dia." }],
    researchHints: {
      framework: "NestJS Next.js TypeScript tutorial",
      fullstack: "TypeScript full stack roadmap",
      softSkills: "typescript developer teamwork code review",
      dayInLife: "day in the life typescript developer",
    },
  }),

  csharp: profile({
    slug: "csharp",
    roleTitle: "Desenvolvedor .NET / C#",
    careerType: "Engenharia de software — backends e apps empresariais Microsoft",
    whatYouDo: [
      "APIs ASP.NET, serviços e integração com SQL Server/Azure",
      "Code review, testes, reuniões ágeis",
      "Manutenção de sistemas legacy + features novas",
    ],
    whatItsLike:
      "C#/.NET é muito comum em empresas. O trabalho mistura Visual Studio, Azure, tickets e muita comunicação com negócio.",
    meetings: COMMON_MEETINGS,
    softSkills: COMMON_SOFT,
    coreFramework: { name: "ASP.NET Core", why: "Framework web/API padrão .NET." },
    complementary: [
      { name: "Entity Framework / SQL", why: "Dados." },
      { name: "xUnit / testes", why: "Evidência." },
      { name: "Docker / Azure", why: "Cloud e contentores." },
      { name: "Git", why: "Colaboração." },
    ],
    fullStackPath: [
      { layer: "Backend", items: "C# · ASP.NET Core", why: "Núcleo." },
      { layer: "Dados", items: "SQL Server · EF", why: "Persistência." },
      { layer: "Frontend", items: "Blazor ou React", why: "UI do produto." },
      { layer: "Entrega", items: "Git · CI · Azure/Docker", why: "Deploy." },
    ],
    workTools: [{ name: "Visual Studio / Rider", why: "Ecossistema .NET." }],
    researchHints: {
      framework: "ASP.NET Core Web API tutorial",
      fullstack: "C# full stack ASP.NET React",
      softSkills: ".NET developer soft skills meetings",
      dayInLife: "day in the life csharp developer",
    },
  }),

  go: profile({
    slug: "go",
    roleTitle: "Desenvolvedor Go (serviços / infra)",
    careerType: "Engenharia de software — APIs, sistemas distribuídos, cloud-native",
    whatYouDo: [
      "Serviços HTTP, workers, ferramentas CLI",
      "Observabilidade, performance e review rigoroso",
      "Colaboração com DevOps/SRE",
    ],
    whatItsLike:
      "Go valoriza simplicidade e serviços fiáveis. O dia tem muito design de APIs, concorrência cuidada e discussões de operação — não só «goroutines por gosto».",
    meetings: COMMON_MEETINGS,
    softSkills: COMMON_SOFT,
    coreFramework: { name: "net/http + chi/echo (ou similar)", why: "APIs idiomáticas em Go." },
    complementary: [
      { name: "SQL / Redis", why: "Estado e cache." },
      { name: "Docker / K8s (intro)", why: "Deploy cloud-native." },
      { name: "Testes + CI", why: "Qualidade." },
      { name: "gRPC (opcional)", why: "Serviços internos." },
    ],
    fullStackPath: [
      { layer: "Backend", items: "Go · HTTP/gRPC", why: "Serviços." },
      { layer: "Dados", items: "SQL · cache", why: "Persistência." },
      { layer: "Frontend complementar", items: "qualquer UI via API", why: "Go costuma ser backend." },
      { layer: "Entrega", items: "Docker · CI · observabilidade", why: "Produção." },
    ],
    workTools: [{ name: "GoLand / VS Code", why: "Tooling Go." }],
    researchHints: {
      framework: "Go HTTP API tutorial",
      fullstack: "Go backend React frontend",
      softSkills: "golang engineer collaboration",
      dayInLife: "day in the life golang developer",
    },
  }),

  rust: profile({
    slug: "rust",
    roleTitle: "Desenvolvedor Rust (sistemas / performance)",
    careerType: "Engenharia de software — sistemas, segurança de memória, performance",
    whatYouDo: [
      "Desenhar APIs e ownership correctos",
      "Debugging difícil, benchmarks, review profundo",
      "Explicar trade-offs de performance/segurança à equipa",
    ],
    whatItsLike:
      "Rust exige paciência com o compilador e comunicação clara do porquê das escolhas. Soft skills de ensino e design importam muito.",
    meetings: COMMON_MEETINGS,
    softSkills: COMMON_SOFT,
    coreFramework: { name: "Axum / Actix (web) ou crates de domínio", why: "Ecossistema conforme o foco." },
    complementary: [
      { name: "Cargo + testes", why: "Build e evidência." },
      { name: "SQL / async", why: "Serviços reais." },
      { name: "Docker", why: "Entrega." },
      { name: "FFI / sistemas (se aplicável)", why: "Casos típicos Rust." },
    ],
    fullStackPath: [
      { layer: "Core", items: "Rust · ownership · testes", why: "Núcleo difícil." },
      { layer: "Serviço", items: "HTTP async · SQL", why: "Produto." },
      { layer: "Frontend", items: "UI via API (TS/React)", why: "Full-stack em equipa." },
      { layer: "Entrega", items: "CI · Docker", why: "Produção." },
    ],
    workTools: [{ name: "rust-analyzer", why: "Feedback do compilador no editor." }],
    researchHints: {
      framework: "Rust Axum web API tutorial",
      fullstack: "Rust backend TypeScript frontend",
      softSkills: "rust developer mentoring communication",
      dayInLife: "day in the life rust developer",
    },
  }),

  kotlin: profile({
    slug: "kotlin",
    roleTitle: "Desenvolvedor Kotlin (Android / Backend JVM)",
    careerType: "Engenharia de software — mobile ou backend JVM moderno",
    whatYouDo: [
      "Features de produto, testes, reviews",
      "Alinhar com design (mobile) ou APIs (backend)",
      "Stand-ups e planeamento de sprint",
    ],
    whatItsLike:
      "Kotlin herda o mundo JVM. Em Android falas muito com design/UX; em backend o perfil parece Java/Spring.",
    meetings: COMMON_MEETINGS,
    softSkills: COMMON_SOFT,
    coreFramework: {
      name: "Android Jetpack ou Ktor/Spring",
      why: "Conforme mobile vs backend.",
    },
    complementary: [
      { name: "Coroutines", why: "Async idiomático." },
      { name: "SQL / Room ou JPA", why: "Dados." },
      { name: "Testes", why: "Evidência." },
      { name: "Git + CI", why: "Entrega." },
    ],
    fullStackPath: [
      { layer: "App / API", items: "Kotlin · Jetpack ou Ktor", why: "Núcleo." },
      { layer: "Dados", items: "SQL", why: "Persistência." },
      { layer: "Complemento", items: "REST · UI guidelines", why: "Produto completo." },
      { layer: "Entrega", items: "Git · CI", why: "Release." },
    ],
    workTools: [{ name: "Android Studio / IntelliJ", why: "Tooling oficial." }],
    researchHints: {
      framework: "Kotlin Spring Boot or Jetpack tutorial",
      fullstack: "Kotlin full stack developer",
      softSkills: "android kotlin developer soft skills",
      dayInLife: "day in the life kotlin developer",
    },
  }),

  sql: profile({
    slug: "sql",
    roleTitle: "Perfil dados / backend com SQL forte",
    careerType: "Dados aplicados + apoio a engenharia de software",
    whatYouDo: [
      "Modelar dados, escrever consultas, optimizar",
      "Explicar resultados a quem não é técnico",
      "Colaborar com backend em contratos e performance",
    ],
    whatItsLike:
      "SQL não é «só SELECT». É modelação, integridade, conversas com negócio e suporte a quem consome os dados.",
    meetings: COMMON_MEETINGS,
    softSkills: COMMON_SOFT,
    coreFramework: { name: "PostgreSQL / MySQL (ou o motor da empresa)", why: "Motor relacional real." },
    complementary: [
      { name: "Modelagem + índices", why: "Performance e correcção." },
      { name: "Backend que consome SQL", why: "Contexto full-stack." },
      { name: "Git + reviews de migrations", why: "Mudanças de schema em equipa." },
    ],
    fullStackPath: [
      { layer: "Dados", items: "SQL · schema · queries", why: "Núcleo." },
      { layer: "Backend", items: "API que usa a BD", why: "Consumo." },
      { layer: "Entrega", items: "migrations · CI", why: "Segurança de mudança." },
    ],
    workTools: [{ name: "Cliente SQL (DBeaver…)", why: "Explorar e explicar dados." }],
    researchHints: {
      framework: "SQL database design best practices",
      fullstack: "SQL for software developers",
      softSkills: "data analyst engineer communication",
      dayInLife: "day in the life database developer",
    },
  }),

  web: profile({
    slug: "web",
    roleTitle: "Desenvolvedor Web (fundamentos → Full-stack)",
    careerType: "Engenharia de software — web",
    whatYouDo: [
      "Construir páginas e componentes acessíveis",
      "Integrar com APIs; discutir UX",
      "Reuniões de sprint e reviews de UI",
    ],
    whatItsLike:
      "Web é comunicação visual + técnica. Passas tempo em browser, acessibilidade e alinhamento com design — não só CSS decorativo.",
    meetings: COMMON_MEETINGS,
    softSkills: COMMON_SOFT,
    coreFramework: { name: "HTML/CSS sólidos + JS", why: "Base antes de frameworks." },
    complementary: [
      { name: "JavaScript / TypeScript", why: "Interatividade." },
      { name: "React (seguinte passo)", why: "Mercado full-stack." },
      { name: "Acessibilidade e performance", why: "Qualidade real." },
      { name: "Git", why: "Equipa." },
    ],
    fullStackPath: [
      { layer: "UI", items: "HTML · CSS · JS", why: "Base." },
      { layer: "Framework", items: "React", why: "Produtos modernos." },
      { layer: "Backend intro", items: "API REST · Node ou outro", why: "Full-stack." },
      { layer: "Entrega", items: "Git · hosting", why: "Publicar." },
    ],
    workTools: [{ name: "DevTools + VS Code", why: "Ofício do browser." }],
    researchHints: {
      framework: "HTML CSS JavaScript responsive tutorial",
      fullstack: "web developer full stack roadmap",
      softSkills: "web developer soft skills design collaboration",
      dayInLife: "day in the life web developer",
    },
  }),

  devops: profile({
    slug: "devops",
    roleTitle: "Engenharia DevOps / Platform",
    careerType: "Entrega contínua, fiabilidade e automação",
    whatYouDo: [
      "Pipelines CI/CD, infra como código, observabilidade",
      "Apoiar developers a publicar com segurança",
      "Incidentes, postmortems, reuniões de capacidade",
    ],
    whatItsLike:
      "DevOps é muito comunicação sob pressão e automação. Soft skills em incidentes e documentação salvam carreiras.",
    meetings: COMMON_MEETINGS,
    softSkills: COMMON_SOFT,
    coreFramework: { name: "CI/CD + containers", why: "Coração da entrega." },
    complementary: [
      { name: "Docker · K8s (intro)", why: "Runtime moderno." },
      { name: "Cloud (AWS/GCP/Azure)", why: "Onde corre o produto." },
      { name: "Observabilidade", why: "Logs, métricas, traces." },
      { name: "Git + IaC", why: "Mudanças auditáveis." },
    ],
    fullStackPath: [
      { layer: "Build", items: "CI · testes", why: "Qualidade." },
      { layer: "Run", items: "Docker · cloud", why: "Produção." },
      { layer: "Ops", items: "monitorização · on-call intro", why: "Fiabilidade." },
    ],
    workTools: [{ name: "Terminal + cloud console", why: "Dia-a-dia ops." }],
    researchHints: {
      framework: "CI CD Docker Kubernetes tutorial",
      fullstack: "devops engineer roadmap",
      softSkills: "devops soft skills incident communication",
      dayInLife: "day in the life devops engineer",
    },
  }),
};

/** Etapas extra do programa quando o objectivo é carreira de programador. */
export const DEV_CAREER_STAGES = [
  { key: "fundamentos", label: "1. Fundamentos", role: "Linguagem e o problema" },
  { key: "conceitos-core", label: "2. Conceitos", role: "Ideias centrais com exemplo" },
  { key: "ferramentas", label: "3. Ambiente", role: "IDE, build, primeiro «olá»" },
  { key: "pratica-guiada", label: "4. Prática", role: "Exercícios com critério" },
  { key: "stack-framework", label: "5. Framework", role: "Ecossistema (ex. Spring Boot)" },
  { key: "fullstack-complementos", label: "6. Full-stack", role: "API, dados, UI, deploy" },
  { key: "padroes", label: "7. Padrões", role: "Boas práticas e trade-offs" },
  { key: "soft-skills", label: "8. Soft skills", role: "Equipa, PRs, reuniões" },
  { key: "carreira-realidade", label: "9. Como é o trabalho", role: "Dia-a-dia da carreira" },
  { key: "projecto", label: "10. Projecto", role: "Artefacto empregável" },
  { key: "tip", label: "11. Fecho", role: "Revisão e evidência" },
] as const;

export function isDevCareerSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return Boolean(DEV_CAREER_PROFILES[slug.toLowerCase()]);
}

export function resolveDevCareer(
  primarySlug: string | null | undefined,
  statement?: string | null,
): DevCareerProfile | null {
  const slug = (primarySlug ?? "").toLowerCase();
  if (DEV_CAREER_PROFILES[slug]) return DEV_CAREER_PROFILES[slug]!;

  // Atalhos do catálogo → perfil de carreira
  const alias: Record<string, string> = {
    react: "javascript",
    nodejs: "javascript",
    spring: "java",
    backend: "java",
    frontend: "javascript",
    fullstack: "javascript",
    mobile: "kotlin",
    php: "web",
    algorithms: "java",
    databases: "sql",
    oop: "java",
    linux: "devops",
    testing: "java",
    design: "web",
  };
  if (alias[slug] && DEV_CAREER_PROFILES[alias[slug]!]) {
    return DEV_CAREER_PROFILES[alias[slug]!]!;
  }

  const text = `${statement ?? ""}`.toLowerCase();
  const hints: Array<[RegExp, string]> = [
    [/\bjava\b|spring\s*boot/, "java"],
    [/\bpython\b|django|fastapi/, "python"],
    [/\btypescript\b|\bts\b/, "typescript"],
    [/\bjavascript\b|\bnode\b|\breact\b/, "javascript"],
    [/\bc#|csharp|\.net|asp\.net/, "csharp"],
    [/\bgolang\b|\bgo\b/, "go"],
    [/\brust\b/, "rust"],
    [/\bkotlin\b|android/, "kotlin"],
    [/\bsql\b|postgres|mysql/, "sql"],
    [/\bhtml\b|\bcss\b|frontend web/, "web"],
    [/\bdevops\b|kubernetes|ci\/cd/, "devops"],
  ];
  for (const [re, key] of hints) {
    if (re.test(text) && DEV_CAREER_PROFILES[key]) return DEV_CAREER_PROFILES[key]!;
  }
  return null;
}

/** Resumo para API / UI (sem corpos longos). */
export function presentDevCareer(profile: DevCareerProfile) {
  return {
    slug: profile.slug,
    roleTitle: profile.roleTitle,
    careerType: profile.careerType,
    whatItsLike: profile.whatItsLike,
    whatYouDo: profile.whatYouDo,
    meetings: profile.meetings,
    softSkills: profile.softSkills,
    coreFramework: profile.coreFramework,
    complementary: profile.complementary,
    fullStackPath: profile.fullStackPath,
    workTools: profile.workTools,
  };
}
