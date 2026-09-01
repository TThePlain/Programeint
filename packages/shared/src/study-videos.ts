/**
 * Sugestões de vídeo por nó — o aluno escolhe a língua e depois 1 de até 3 opções.
 * IDs validados via oEmbed/embed; independente da biblioteca (licenças oficiais).
 */
export const STUDY_VIDEO_LANGUAGES = [
  { id: "pt", label: "Português" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
] as const;

export type StudyVideoLanguage = (typeof STUDY_VIDEO_LANGUAGES)[number]["id"];

export type StudyVideo = {
  id: string;
  title: string;
  channel: string;
  youtubeId: string;
  language: StudyVideoLanguage;
  /** Playlist YouTube — se existir, o aluno vê a série completa. */
  playlistId?: string;
};

const VIDEOS: StudyVideo[] = [
  // —— logic ——
  {
    id: "logic-pt-1",
    title: "Curso de Algoritmos — Lógica de programação",
    channel: "Curso em Vídeo",
    youtubeId: "8mei6uVttho",
    playlistId: "PLHz_AreHm4dmSj0MHol_aoNegEhJgVvY6",
    language: "pt",
  },
  { id: "logic-pt-2", title: "Primeiro algoritmo", channel: "Curso em Vídeo", youtubeId: "M2Af7gkbbro", language: "pt" },
  { id: "logic-pt-3", title: "Lógica de programação — por onde começar", channel: "Attekita Dev", youtubeId: "gMxQ8vxH9Vk", language: "pt" },
  { id: "logic-en-1", title: "Intro to programming & computer science", channel: "freeCodeCamp", youtubeId: "zOjov-2OZ0E", language: "en" },
  { id: "logic-en-2", title: "Harvard CS50 — full course", channel: "freeCodeCamp", youtubeId: "8mAITcNt710", language: "en" },
  { id: "logic-en-3", title: "Algorithms & data structures tutorial", channel: "freeCodeCamp", youtubeId: "8hly31xKli0", language: "en" },
  { id: "logic-es-1", title: "Introducción a Java", channel: "ProgramacionATS", youtubeId: "2ZXiuh0rg3M", language: "es" },
  { id: "logic-es-2", title: "Descargar NetBeans", channel: "ProgramacionATS", youtubeId: "9DE_Z4L8urI", language: "es" },
  { id: "logic-es-3", title: "Hola mundo en Java", channel: "ProgramacionATS", youtubeId: "Ko2KgWWGNQ0", language: "es" },

  // —— algorithms ——
  {
    id: "algo-pt-1",
    title: "Curso de Algoritmos",
    channel: "Curso em Vídeo",
    youtubeId: "RDrfZ-7WE8c",
    playlistId: "PLHz_AreHm4dmSj0MHol_aoNegEhJgVvY6",
    language: "pt",
  },
  { id: "algo-pt-2", title: "Operadores lógicos e relacionais", channel: "Curso em Vídeo", youtubeId: "Ig4QZNpVZYs", language: "pt" },
  { id: "algo-pt-3", title: "Introdução a algoritmos", channel: "Curso em Vídeo", youtubeId: "8mei6uVttho", language: "pt" },
  { id: "algo-en-1", title: "Algorithms & data structures — full course", channel: "freeCodeCamp", youtubeId: "8hly31xKli0", language: "en" },
  { id: "algo-en-2", title: "Harvard CS50", channel: "freeCodeCamp", youtubeId: "8mAITcNt710", language: "en" },
  { id: "algo-en-3", title: "Data structures easy to advanced", channel: "freeCodeCamp", youtubeId: "RBSGKlAvoiM", language: "en" },
  { id: "algo-es-1", title: "Tipos de datos primitivos", channel: "ProgramacionATS", youtubeId: "lWgHvh1bKrA", language: "es" },
  { id: "algo-es-2", title: "Operadores aritméticos", channel: "ProgramacionATS", youtubeId: "KWlEHXpvA7A", language: "es" },
  { id: "algo-es-3", title: "Entrada y salida por consola", channel: "ProgramacionATS", youtubeId: "-w2EM17HHn4", language: "es" },

  // —— data-structures ——
  { id: "ds-pt-1", title: "Estruturas de dados com Java", channel: "Matheus Leandro Ferreira", youtubeId: "Ly1To6_5eQM", language: "pt" },
  { id: "ds-pt-2", title: "DSA completo em 60 min", channel: "Augusto Galego", youtubeId: "TcNt1aW1OMM", language: "pt" },
  { id: "ds-pt-3", title: "Vetores (arrays) em Java", channel: "Loiane Groner", youtubeId: "HxRb5KLofcI", language: "pt" },
  { id: "ds-en-1", title: "Data structures — full tutorial", channel: "freeCodeCamp", youtubeId: "RBSGKlAvoiM", language: "en" },
  { id: "ds-en-2", title: "Introduction to data structures", channel: "mycodeschool", youtubeId: "92S4zgXN17o", language: "en" },
  { id: "ds-en-3", title: "Algorithms & data structures tutorial", channel: "freeCodeCamp", youtubeId: "8hly31xKli0", language: "en" },
  { id: "ds-es-1", title: "Tipos no primitivos y Strings", channel: "ProgramacionATS", youtubeId: "URPsISB-5nk", language: "es" },
  { id: "ds-es-2", title: "Constantes en Java", channel: "ProgramacionATS", youtubeId: "HZyxCfp7WVI", language: "es" },
  { id: "ds-es-3", title: "Sentencia if else", channel: "ProgramacionATS", youtubeId: "taSF09mPlcs", language: "es" },

  // —— java ——
  { id: "java-pt-1", title: "História do Java", channel: "Curso em Vídeo", youtubeId: "sTX0UEplF54", language: "pt" },
  { id: "java-pt-2", title: "Como funciona o Java", channel: "Curso em Vídeo", youtubeId: "v_ZCtgwbS3o", language: "pt" },
  { id: "java-pt-3", title: "Java — introdução e dicas", channel: "Loiane Groner", youtubeId: "LnORjqZUMIQ", language: "pt" },
  { id: "java-en-1", title: "Java full course for beginners", channel: "Programming with Mosh", youtubeId: "eIrMbAQSU34", language: "en" },
  { id: "java-en-2", title: "Java tutorial in 2 hours", channel: "Apna College", youtubeId: "UmnCZ7-9yDY", language: "en" },
  { id: "java-en-3", title: "Intro to programming", channel: "freeCodeCamp", youtubeId: "zOjov-2OZ0E", language: "en" },
  { id: "java-es-1", title: "Introducción a Java", channel: "ProgramacionATS", youtubeId: "2ZXiuh0rg3M", language: "es" },
  { id: "java-es-2", title: "Hola mundo en Java", channel: "ProgramacionATS", youtubeId: "Ko2KgWWGNQ0", language: "es" },
  { id: "java-es-3", title: "Tipos de datos primitivos", channel: "ProgramacionATS", youtubeId: "lWgHvh1bKrA", language: "es" },

  // —— oop ——
  { id: "oop-pt-1", title: "O que é POO", channel: "Curso em Vídeo", youtubeId: "KlIL63MeyMY", language: "pt" },
  { id: "oop-pt-2", title: "O que é um objeto", channel: "Curso em Vídeo", youtubeId: "aR7CKNFECx0", language: "pt" },
  { id: "oop-pt-3", title: "POO — explicação fácil", channel: "Attekita Dev", youtubeId: "dXZRgW-X2ls", language: "pt" },
  { id: "oop-en-1", title: "OOP crash course", channel: "freeCodeCamp", youtubeId: "SiBw7os-_zI", language: "en" },
  { id: "oop-en-2", title: "Java full course (OOP section)", channel: "Programming with Mosh", youtubeId: "eIrMbAQSU34", language: "en" },
  { id: "oop-en-3", title: "Java tutorial for beginners", channel: "Apna College", youtubeId: "UmnCZ7-9yDY", language: "en" },
  { id: "oop-es-1", title: "Creación de clases y objetos", channel: "ProgramacionATS", youtubeId: "oMWrJwMPd6k", language: "es" },
  { id: "oop-es-2", title: "Introducción a Java", channel: "ProgramacionATS", youtubeId: "2ZXiuh0rg3M", language: "es" },
  { id: "oop-es-3", title: "Hola mundo en Java", channel: "ProgramacionATS", youtubeId: "Ko2KgWWGNQ0", language: "es" },

  // —— java-collections ——
  { id: "col-pt-1", title: "Vetores (arrays)", channel: "Loiane Groner", youtubeId: "HxRb5KLofcI", language: "pt" },
  { id: "col-pt-2", title: "Estruturas de dados com Java", channel: "Matheus Leandro Ferreira", youtubeId: "Ly1To6_5eQM", language: "pt" },
  { id: "col-pt-3", title: "Tipos primitivos e dados", channel: "Curso em Vídeo", youtubeId: "JEAQeT7YGs4", language: "pt" },
  { id: "col-en-1", title: "Data structures full course", channel: "freeCodeCamp", youtubeId: "RBSGKlAvoiM", language: "en" },
  { id: "col-en-2", title: "Introduction to data structures", channel: "mycodeschool", youtubeId: "92S4zgXN17o", language: "en" },
  { id: "col-en-3", title: "Java full course", channel: "Programming with Mosh", youtubeId: "eIrMbAQSU34", language: "en" },
  { id: "col-es-1", title: "Tipos no primitivos y Strings", channel: "ProgramacionATS", youtubeId: "URPsISB-5nk", language: "es" },
  { id: "col-es-2", title: "Tipos de datos primitivos", channel: "ProgramacionATS", youtubeId: "lWgHvh1bKrA", language: "es" },
  { id: "col-es-3", title: "Creación de clases y objetos", channel: "ProgramacionATS", youtubeId: "oMWrJwMPd6k", language: "es" },

  // —— java-exceptions ——
  { id: "ex-pt-1", title: "Polimorfismo e herança", channel: "Daniele Leão", youtubeId: "eTX4ZH0opA4", language: "pt" },
  { id: "ex-pt-2", title: "POO — o que é um objeto", channel: "Curso em Vídeo", youtubeId: "aR7CKNFECx0", language: "pt" },
  { id: "ex-pt-3", title: "Primeiro programa em Java", channel: "Loiane Groner", youtubeId: "mu2ti43cgwc", language: "pt" },
  { id: "ex-en-1", title: "Java full course", channel: "Programming with Mosh", youtubeId: "eIrMbAQSU34", language: "en" },
  { id: "ex-en-2", title: "Spring Boot tutorial", channel: "freeCodeCamp", youtubeId: "vtPkZShrvXQ", language: "en" },
  { id: "ex-en-3", title: "TDD introduction", channel: "Fireship", youtubeId: "Jv2uxzhPFl4", language: "en" },
  { id: "ex-es-1", title: "Sentencia if else", channel: "ProgramacionATS", youtubeId: "taSF09mPlcs", language: "es" },
  { id: "ex-es-2", title: "Operadores aritméticos", channel: "ProgramacionATS", youtubeId: "KWlEHXpvA7A", language: "es" },
  { id: "ex-es-3", title: "Entrada y salida", channel: "ProgramacionATS", youtubeId: "-w2EM17HHn4", language: "es" },

  // —— git ——
  { id: "git-pt-1", title: "Git e GitHub — do zero ao avançado", channel: "Stack Mobile", youtubeId: "LeAEMvHEx4o", language: "pt" },
  { id: "git-en-1", title: "Git and GitHub crash course", channel: "freeCodeCamp", youtubeId: "RGOj5yH7evk", language: "en" },
  { id: "git-en-2", title: "Intro to programming", channel: "freeCodeCamp", youtubeId: "zOjov-2OZ0E", language: "en" },
  { id: "git-en-3", title: "CS50 full course", channel: "freeCodeCamp", youtubeId: "8mAITcNt710", language: "en" },
  { id: "git-es-1", title: "Introducción a Java (flujo de herramientas)", channel: "ProgramacionATS", youtubeId: "2ZXiuh0rg3M", language: "es" },
  { id: "git-es-2", title: "Descargar NetBeans", channel: "ProgramacionATS", youtubeId: "9DE_Z4L8urI", language: "es" },
  { id: "git-es-3", title: "Hola mundo", channel: "ProgramacionATS", youtubeId: "Ko2KgWWGNQ0", language: "es" },

  // —— sql ——
  { id: "sql-pt-1", title: "O que é um banco de dados", channel: "Curso em Vídeo", youtubeId: "Ofktsne-utM", language: "pt" },
  { id: "sql-pt-2", title: "SQL para iniciantes", channel: "Hashtag Programação", youtubeId: "6M-jFECiHog", language: "pt" },
  { id: "sql-pt-3", title: "SQL com PostgreSQL", channel: "Stack Mobile", youtubeId: "9cAKQWodpvM", language: "pt" },
  { id: "sql-en-1", title: "SQL full database course", channel: "freeCodeCamp", youtubeId: "HXV3zeQKqGY", language: "en" },
  { id: "sql-en-2", title: "SQL course for beginners", channel: "Programming with Mosh", youtubeId: "7S_tz1z_5bA", language: "en" },
  { id: "sql-en-3", title: "Node + Express (APIs & data)", channel: "freeCodeCamp", youtubeId: "Oe421EPjeBE", language: "en" },
  { id: "sql-es-1", title: "Introducción a Java (base)", channel: "ProgramacionATS", youtubeId: "2ZXiuh0rg3M", language: "es" },
  { id: "sql-es-2", title: "Tipos de datos", channel: "ProgramacionATS", youtubeId: "lWgHvh1bKrA", language: "es" },
  { id: "sql-es-3", title: "Entrada y salida", channel: "ProgramacionATS", youtubeId: "-w2EM17HHn4", language: "es" },

  // —— testing ——
  { id: "test-pt-1", title: "Spring Boot do zero", channel: "DevSuperior", youtubeId: "D4frmIHAxEY", language: "pt" },
  { id: "test-pt-2", title: "CRUD com Spring (prática)", channel: "Fernanda Kipper", youtubeId: "tP6wtEaCnSI", language: "pt" },
  { id: "test-pt-3", title: "Spring para iniciantes", channel: "Fiasco", youtubeId: "n8_qrrc8WN4", language: "pt" },
  { id: "test-en-1", title: "TDD introduction", channel: "Fireship", youtubeId: "Jv2uxzhPFl4", language: "en" },
  { id: "test-en-2", title: "Spring Boot tutorial", channel: "freeCodeCamp", youtubeId: "vtPkZShrvXQ", language: "en" },
  { id: "test-en-3", title: "Java full course", channel: "Programming with Mosh", youtubeId: "eIrMbAQSU34", language: "en" },
  { id: "test-es-1", title: "Creación de clases y objetos", channel: "ProgramacionATS", youtubeId: "oMWrJwMPd6k", language: "es" },
  { id: "test-es-2", title: "Hola mundo", channel: "ProgramacionATS", youtubeId: "Ko2KgWWGNQ0", language: "es" },
  { id: "test-es-3", title: "Sentencia if else", channel: "ProgramacionATS", youtubeId: "taSF09mPlcs", language: "es" },

  // —— rest ——
  { id: "rest-pt-1", title: "API REST com Spring Boot", channel: "Build & Run", youtubeId: "A2zJpPi8JeQ", language: "pt" },
  { id: "rest-pt-2", title: "Primeira API REST", channel: "Souza DEV", youtubeId: "YuzWGKSzEcE", language: "pt" },
  { id: "rest-pt-3", title: "CRUD API Rest ao vivo", channel: "Fernanda Kipper", youtubeId: "tP6wtEaCnSI", language: "pt" },
  { id: "rest-en-1", title: "What is a REST API?", channel: "IBM Technology", youtubeId: "lsMQRaeKNDk", language: "en" },
  { id: "rest-en-2", title: "REST API concepts", channel: "WebConcepts", youtubeId: "7YcW25PHnAA", language: "en" },
  { id: "rest-en-3", title: "Spring Boot for beginners", channel: "freeCodeCamp", youtubeId: "vtPkZShrvXQ", language: "en" },
  { id: "rest-es-1", title: "Introducción a Java", channel: "ProgramacionATS", youtubeId: "2ZXiuh0rg3M", language: "es" },
  { id: "rest-es-2", title: "Creación de clases", channel: "ProgramacionATS", youtubeId: "oMWrJwMPd6k", language: "es" },
  { id: "rest-es-3", title: "Hola mundo", channel: "ProgramacionATS", youtubeId: "Ko2KgWWGNQ0", language: "es" },

  // —— spring ——
  { id: "spring-pt-1", title: "Spring para iniciantes", channel: "Fiasco", youtubeId: "n8_qrrc8WN4", language: "pt" },
  { id: "spring-pt-2", title: "Spring Framework — dicionário", channel: "Código Fonte TV", youtubeId: "j_F0cz0em04", language: "pt" },
  { id: "spring-pt-3", title: "Primeiro projeto Spring Boot", channel: "DevSuperior", youtubeId: "D4frmIHAxEY", language: "pt" },
  { id: "spring-en-1", title: "Spring Boot tutorial", channel: "freeCodeCamp", youtubeId: "vtPkZShrvXQ", language: "en" },
  { id: "spring-en-2", title: "Dependency injection", channel: "Java Brains", youtubeId: "GB8k2-Egfv0", language: "en" },
  { id: "spring-en-3", title: "Spring Boot 2025", channel: "Programming with Mosh", youtubeId: "gJrjgg1KVL4", language: "en" },
  { id: "spring-es-1", title: "Introducción a Java", channel: "ProgramacionATS", youtubeId: "2ZXiuh0rg3M", language: "es" },
  { id: "spring-es-2", title: "Creación de clases", channel: "ProgramacionATS", youtubeId: "oMWrJwMPd6k", language: "es" },
  { id: "spring-es-3", title: "Tipos de datos", channel: "ProgramacionATS", youtubeId: "lWgHvh1bKrA", language: "es" },

  // —— spring-boot ——
  { id: "boot-pt-1", title: "Spring Boot em 1 hora", channel: "Fiasco", youtubeId: "g4y0yADhsJA", language: "pt" },
  { id: "boot-pt-2", title: "Spring Boot do zero ao deploy", channel: "Daniele Leão", youtubeId: "0V8OKTYNeU8", language: "pt" },
  { id: "boot-pt-3", title: "API com Spring Boot", channel: "Build & Run", youtubeId: "A2zJpPi8JeQ", language: "pt" },
  { id: "boot-en-1", title: "Spring Boot tutorial", channel: "freeCodeCamp", youtubeId: "vtPkZShrvXQ", language: "en" },
  { id: "boot-en-2", title: "Spring Boot for beginners 2025", channel: "Programming with Mosh", youtubeId: "gJrjgg1KVL4", language: "en" },
  { id: "boot-en-3", title: "Dependency injection", channel: "Java Brains", youtubeId: "GB8k2-Egfv0", language: "en" },
  { id: "boot-es-1", title: "Hola mundo en Java", channel: "ProgramacionATS", youtubeId: "Ko2KgWWGNQ0", language: "es" },
  { id: "boot-es-2", title: "Creación de clases", channel: "ProgramacionATS", youtubeId: "oMWrJwMPd6k", language: "es" },
  { id: "boot-es-3", title: "Introducción a Java", channel: "ProgramacionATS", youtubeId: "2ZXiuh0rg3M", language: "es" },

  // —— docker ——
  { id: "docker-pt-1", title: "Docker do iniciante ao avançado", channel: "Otávio Miranda", youtubeId: "IeyO3TnHcaw", language: "pt" },
  { id: "docker-pt-2", title: "Spring Boot (contentores na prática)", channel: "DevSuperior", youtubeId: "D4frmIHAxEY", language: "pt" },
  { id: "docker-pt-3", title: "Git e fluxo de projeto", channel: "Stack Mobile", youtubeId: "LeAEMvHEx4o", language: "pt" },
  { id: "docker-en-1", title: "Docker full DevOps course", channel: "freeCodeCamp", youtubeId: "fqMOX6JJhGo", language: "en" },
  { id: "docker-en-2", title: "Docker tutorial in 3 hours", channel: "TechWorld with Nana", youtubeId: "3c-iBn73dDE", language: "en" },
  { id: "docker-en-3", title: "Node & Express (deploy mindset)", channel: "freeCodeCamp", youtubeId: "Oe421EPjeBE", language: "en" },
  { id: "docker-es-1", title: "Introducción a Java", channel: "ProgramacionATS", youtubeId: "2ZXiuh0rg3M", language: "es" },
  { id: "docker-es-2", title: "Descargar herramientas", channel: "ProgramacionATS", youtubeId: "9DE_Z4L8urI", language: "es" },
  { id: "docker-es-3", title: "Hola mundo", channel: "ProgramacionATS", youtubeId: "Ko2KgWWGNQ0", language: "es" },

  // —— java-backend ——
  { id: "jb-pt-1", title: "Spring Boot + API", channel: "Build & Run", youtubeId: "A2zJpPi8JeQ", language: "pt" },
  { id: "jb-pt-2", title: "Spring Boot em 1 hora", channel: "Fiasco", youtubeId: "g4y0yADhsJA", language: "pt" },
  { id: "jb-pt-3", title: "Primeiro projeto Java web", channel: "DevSuperior", youtubeId: "D4frmIHAxEY", language: "pt" },
  { id: "jb-en-1", title: "Spring Boot tutorial", channel: "freeCodeCamp", youtubeId: "vtPkZShrvXQ", language: "en" },
  { id: "jb-en-2", title: "REST API concepts", channel: "WebConcepts", youtubeId: "7YcW25PHnAA", language: "en" },
  { id: "jb-en-3", title: "Java full course", channel: "Programming with Mosh", youtubeId: "eIrMbAQSU34", language: "en" },
  { id: "jb-es-1", title: "Introducción a Java", channel: "ProgramacionATS", youtubeId: "2ZXiuh0rg3M", language: "es" },
  { id: "jb-es-2", title: "Creación de clases", channel: "ProgramacionATS", youtubeId: "oMWrJwMPd6k", language: "es" },
  { id: "jb-es-3", title: "Hola mundo", channel: "ProgramacionATS", youtubeId: "Ko2KgWWGNQ0", language: "es" },
];

/** nodeSlug → prefix used in video ids (logic-pt-1 → logic) */
const NODE_PREFIX: Record<string, string> = {
  logic: "logic",
  algorithms: "algo",
  "data-structures": "ds",
  java: "java",
  oop: "oop",
  "java-collections": "col",
  "java-exceptions": "ex",
  git: "git",
  sql: "sql",
  testing: "test",
  rest: "rest",
  spring: "spring",
  "spring-boot": "boot",
  docker: "docker",
  "java-backend": "jb",
};

function videosForPrefix(prefix: string): StudyVideo[] {
  return VIDEOS.filter((item) => item.id.startsWith(`${prefix}-`));
}

export function studyVideosForNode(
  nodeSlug: string,
  language?: StudyVideoLanguage,
): StudyVideo[] {
  const prefix = NODE_PREFIX[nodeSlug];
  if (!prefix) return [];
  const all = videosForPrefix(prefix);
  const filtered = language ? all.filter((item) => item.language === language) : all;
  // 1 vídeo por língua (mapa: etapa + língua)
  const counts = new Map<string, number>();
  const out: StudyVideo[] = [];
  for (const item of filtered) {
    const n = counts.get(item.language) ?? 0;
    if (n >= 1) continue;
    counts.set(item.language, n + 1);
    out.push(item);
  }
  return out;
}

export function studyVideoLanguagesForNode(nodeSlug: string): StudyVideoLanguage[] {
  const prefix = NODE_PREFIX[nodeSlug];
  if (!prefix) return [];
  const present = new Set(videosForPrefix(prefix).map((item) => item.language));
  return STUDY_VIDEO_LANGUAGES.map((item) => item.id).filter((id) => present.has(id));
}

export function youtubeEmbedUrl(
  youtubeId: string,
  options?: { playlistId?: string | null; autoplay?: boolean },
): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
  });
  if (options?.autoplay) params.set("autoplay", "1");
  if (options?.playlistId) {
    // Vídeo + playlist: começa neste vídeo e deixa seguir a série toda
    params.set("list", options.playlistId);
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}?${params.toString()}`;
}

export function studyVideoLanguageLabel(id: string): string {
  return STUDY_VIDEO_LANGUAGES.find((item) => item.id === id)?.label ?? id;
}

export const STUDY_AREA_LABELS: Record<string, string> = {
  foundations: "Fundamentos",
  language: "Linguagem",
  tooling: "Ferramentas",
  data: "Dados",
  engineering: "Engenharia",
  "java-backend": "Java Backend",
};
