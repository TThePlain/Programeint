import { z } from "zod";

/**
 * Catálogo de objectivos — Programeint é plataforma de **tecnologia e programação**.
 * «custom» = outro tema tech (pesquisa + mapa gerado).
 */
export const GOAL_CATALOG = [
  // Linguagens
  { slug: "java", label: "Java", family: "programacao" },
  { slug: "python", label: "Python", family: "programacao" },
  { slug: "javascript", label: "JavaScript", family: "programacao" },
  { slug: "typescript", label: "TypeScript", family: "programacao" },
  { slug: "csharp", label: "C#", family: "programacao" },
  { slug: "go", label: "Go", family: "programacao" },
  { slug: "rust", label: "Rust", family: "programacao" },
  { slug: "kotlin", label: "Kotlin", family: "programacao" },
  { slug: "php", label: "PHP", family: "programacao" },
  { slug: "sql", label: "SQL", family: "programacao" },
  { slug: "web", label: "HTML / CSS", family: "programacao" },
  // Stacks / caminhos
  { slug: "react", label: "React", family: "stacks" },
  { slug: "nodejs", label: "Node.js", family: "stacks" },
  { slug: "spring", label: "Spring Boot", family: "stacks" },
  { slug: "backend", label: "Backend", family: "stacks" },
  { slug: "frontend", label: "Frontend", family: "stacks" },
  { slug: "fullstack", label: "Full-stack", family: "stacks" },
  { slug: "mobile", label: "Mobile", family: "stacks" },
  // Fundamentos CS
  { slug: "algorithms", label: "Algoritmos e estruturas", family: "fundamentos" },
  { slug: "databases", label: "Bases de dados", family: "fundamentos" },
  { slug: "oop", label: "POO / design de código", family: "fundamentos" },
  // Ferramentas
  { slug: "git", label: "Git / GitHub", family: "ferramentas" },
  { slug: "docker", label: "Docker", family: "ferramentas" },
  { slug: "linux", label: "Linux / terminal", family: "ferramentas" },
  { slug: "testing", label: "Testes (unit / integração)", family: "ferramentas" },
  // Tecnologia
  { slug: "devops", label: "DevOps", family: "tech" },
  { slug: "cloud", label: "Cloud", family: "tech" },
  { slug: "data", label: "Data Science", family: "tech" },
  { slug: "ml", label: "Machine Learning", family: "tech" },
  { slug: "ai", label: "IA aplicada", family: "tech" },
  { slug: "security", label: "Cibersegurança", family: "tech" },
  { slug: "architecture", label: "Arquitectura de software", family: "tech" },
  { slug: "design", label: "UI / UX para produto", family: "tech" },
  // Livre (ainda tech)
  {
    slug: "custom",
    label: "Outro (tecnologia / programação)",
    family: "custom",
  },
] as const;

export type GoalSlug = (typeof GOAL_CATALOG)[number]["slug"];

export const GOAL_SLUGS = GOAL_CATALOG.map((item) => item.slug) as [GoalSlug, ...GoalSlug[]];

export const GOAL_FAMILY_LABEL: Record<string, string> = {
  programacao: "Linguagens",
  stacks: "Stacks e caminhos",
  fundamentos: "Fundamentos",
  ferramentas: "Ferramentas",
  tech: "Tecnologia",
  custom: "Personalizado",
};

/** Nível no objectivo tech. */
export const EXPERIENCE_LEVELS = ["none", "beginner", "intermediate", "advanced"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const EXPERIENCE_LEVEL_LABEL: Record<ExperienceLevel, string> = {
  none: "Começo do zero nesta tecnologia",
  beginner: "Iniciante — já vi o básico",
  intermediate: "Intermédio — pratico com alguma regularidade",
  advanced: "Avançado — quero aprofundar e integrar",
};

export const SESSION_MINUTES = [15, 25, 45, 60, 90] as const;

/** Sequência pedagógica padrão do mapa (estudo de programação / tech). */
export const STUDY_PROGRAM_STAGES = [
  { key: "fundamentos", label: "1. Fundamentos", role: "Conceitos base e o problema" },
  { key: "conceitos-core", label: "2. Conceitos", role: "Ideias centrais com exemplo de código" },
  { key: "ferramentas", label: "3. Ferramentas", role: "Ambiente, docs e tooling" },
  { key: "pratica-guiada", label: "4. Prática", role: "Exercícios com critério" },
  { key: "padroes", label: "5. Padrões", role: "Boas práticas e trade-offs" },
  { key: "projecto", label: "6. Projecto", role: "Artefacto / portfolio" },
  { key: "tip", label: "7. Fecho", role: "Revisão e evidência" },
] as const;

/** Label «Outro…» (inclui objectivos antigos «qualquer objectivo»). */
export function isCustomGoalLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  return /^outro\b/i.test(label.trim());
}

export const onboardingSchema = z
  .object({
    statement: z
      .string()
      .trim()
      .min(8, "Descreve o objetivo com pelo menos 8 caracteres.")
      .max(280, "O objetivo deve ter no máximo 280 caracteres."),
    primaryTarget: z.enum(GOAL_SLUGS, {
      errorMap: () => ({ message: "Escolhe uma tecnologia da lista (ou Outro)." }),
    }),
    experienceLevel: z.enum(EXPERIENCE_LEVELS, {
      errorMap: () => ({ message: "Indica o teu nível neste objectivo." }),
    }),
    knownTopics: z.array(z.enum(GOAL_SLUGS)).max(20).default([]),
    weeklyHours: z
      .number({ invalid_type_error: "Indica as horas semanais." })
      .int()
      .min(1, "Mínimo 1 hora por semana.")
      .max(40, "Máximo 40 horas por semana."),
    sessionMinutes: z.union([
      z.literal(15),
      z.literal(25),
      z.literal(45),
      z.literal(60),
      z.literal(90),
    ]),
    prefersVideo: z.boolean(),
    prefersReading: z.boolean(),
    prefersPractice: z.boolean(),
  })
  .refine((data) => data.prefersVideo || data.prefersReading || data.prefersPractice, {
    message: "Escolhe pelo menos um tipo de material.",
    path: ["prefersPractice"],
  })
  .refine((data) => data.primaryTarget !== "custom" || data.statement.trim().length >= 12, {
    message: "Para um objetivo personalizado, descreve a tecnologia com mais detalhe (mín. 12 caracteres).",
    path: ["statement"],
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** Actualizar objectivo existente (sem criar outro). */
export const updateGoalSchema = z
  .object({
    statement: z
      .string()
      .trim()
      .min(8, "Descreve o objectivo com pelo menos 8 caracteres.")
      .max(280, "O objectivo deve ter no máximo 280 caracteres.")
      .optional(),
    experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
    regenerate: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.statement) || Boolean(data.experienceLevel), {
    message: "Indica o statement e/ou o nível a actualizar.",
  });

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
