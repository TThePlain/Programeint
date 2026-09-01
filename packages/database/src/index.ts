export { PrismaClient, Prisma } from "@prisma/client";
export { seedCurriculum, GOAL_SLUG_TO_NODE } from "./curriculum";
export { seedLabExercises } from "./lab";
export { seedProjects } from "./projects";
export { RESOURCES, resourceMatchesContext, seedLibrary } from "./library";
export type {
  User,
  Profile,
  Session,
  EmailVerificationToken,
  PasswordResetToken,
  AuditLog,
  Goal,
  GoalTarget,
  StudyPreferences,
  KnowledgeNode,
  NodePrerequisite,
  Question,
  DiagnosisSession,
  DiagnosisAnswer,
  NodeMastery,
  LearningModule,
  StudySession,
  FsrsCard,
  LabExercise,
  LabWorkspace,
  LabFile,
  LabRun,
  PortfolioProject,
  ProjectRequirement,
  ProjectWorkspace,
  ProjectFile,
  ProjectRun,
  PortfolioEvidence,
  GithubAccount,
} from "@prisma/client";
