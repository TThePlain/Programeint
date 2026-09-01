import { Inject, Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { GOAL_CATALOG, onboardingSchema, updateGoalSchema } from "@programeint/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseBody } from "../common/parse";
import { CurriculumGeneratorService } from "../curriculum/curriculum-generator.service";
import { clearGoalGraph } from "../curriculum/clear-goal-graph";
import { findCurrentGoal } from "../curriculum/curriculum-context";

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CurriculumGeneratorService) private readonly curriculum: CurriculumGeneratorService,
  ) {}

  async get(userId: string) {
    const [goal, preferences, goals] = await Promise.all([
      findCurrentGoal(this.prisma, userId),
      this.prisma.studyPreferences.findUnique({ where: { userId } }),
      this.prisma.goal.findMany({
        where: { userId, status: "active" },
        include: { targets: true },
        orderBy: [{ isCurrent: "desc" }, { updatedAt: "desc" }],
      }),
    ]);

    return {
      complete: Boolean(goal && preferences?.onboardingCompletedAt),
      goal: goal ? serializeGoal(goal) : null,
      goals: goals.map(serializeGoal),
      preferences: preferences ? serializePreferences(preferences) : null,
    };
  }

  async listGoals(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId, status: "active" },
      include: { targets: true },
      orderBy: [{ isCurrent: "desc" }, { updatedAt: "desc" }],
    });
    return { items: goals.map(serializeGoal) };
  }

  /** Troca o objectivo em foco — mapa/vídeos/evolução passam a este, sem misturar. */
  async activateGoal(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId, status: "active" },
      include: { targets: true },
    });
    if (!goal) throw new NotFoundException("Objectivo não encontrado.");

    await this.prisma.$transaction([
      this.prisma.goal.updateMany({ where: { userId }, data: { isCurrent: false } }),
      this.prisma.goal.update({ where: { id: goalId }, data: { isCurrent: true } }),
    ]);

    return this.get(userId);
  }

  async archiveGoal(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId, status: "active" },
    });
    if (!goal) throw new NotFoundException("Objectivo não encontrado.");

    const others = await this.prisma.goal.count({
      where: { userId, status: "active", id: { not: goalId } },
    });
    if (others === 0) {
      throw new ForbiddenException("Não podes arquivar o único objectivo activo. Apaga-o ou cria outro primeiro.");
    }

    await this.prisma.goal.update({
      where: { id: goalId },
      data: { status: "archived", isCurrent: false },
    });

    if (goal.isCurrent) {
      const next = await this.prisma.goal.findFirst({
        where: { userId, status: "active" },
        orderBy: { updatedAt: "desc" },
      });
      if (next) {
        await this.prisma.goal.update({ where: { id: next.id }, data: { isCurrent: true } });
      }
    }

    return this.get(userId);
  }

  /** Apaga objectivo e o mapa associado (vídeos, módulos, diagnóstico). */
  async deleteGoal(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId },
    });
    if (!goal) throw new NotFoundException("Objectivo não encontrado.");

    const wasCurrent = goal.isCurrent;
    await clearGoalGraph(this.prisma, goalId);
    await this.prisma.goal.delete({ where: { id: goalId } });

    if (wasCurrent) {
      const next = await this.prisma.goal.findFirst({
        where: { userId, status: "active" },
        orderBy: { updatedAt: "desc" },
      });
      if (next) {
        await this.prisma.goal.update({ where: { id: next.id }, data: { isCurrent: true } });
      }
    }

    return this.get(userId);
  }

  /** Regenera o mapa de um objectivo (útil após falha). */
  async regenerateGoal(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId, status: "active" },
    });
    if (!goal) throw new NotFoundException("Objectivo não encontrado.");
    // Corre em background para a UI não bloquear; marca generating já dentro
    void this.curriculum.regenerateForGoal(goalId).catch((error) => {
      // regenerateForGoal já grava failed
      void error;
    });
    await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        curriculumStatus: "generating",
        curriculumNote: "A regenerar o mapa de estudo…",
      },
    });
    return this.get(userId);
  }

  /** Actualiza statement/nível do objectivo sem criar outro. */
  async updateGoal(
    userId: string,
    goalId: string,
    raw: unknown,
    req: { ip?: string; headers: Record<string, unknown> },
  ) {
    const input = parseBody(updateGoalSchema, raw);
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId, status: "active" },
      include: { targets: true },
    });
    if (!goal) throw new NotFoundException("Objectivo não encontrado.");

    const statementChanged =
      Boolean(input.statement) && input.statement!.trim() !== goal.statement.trim();

    if (input.statement) {
      await this.prisma.goal.update({
        where: { id: goalId },
        data: { statement: input.statement.trim() },
      });
      const primary = goal.targets.find((t) => t.isPrimary);
      if (primary?.slug === "custom") {
        await this.prisma.goalTarget.update({
          where: { id: primary.id },
          data: { label: input.statement.trim().slice(0, 80) },
        });
      }
    }

    if (input.experienceLevel) {
      const prefs = await this.prisma.studyPreferences.findUnique({ where: { userId } });
      if (prefs) {
        await this.prisma.studyPreferences.update({
          where: { userId },
          data: { experienceLevel: input.experienceLevel },
        });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "goal.update",
        entity: "goal",
        entityId: goalId,
        ip: typeof req.ip === "string" ? req.ip : undefined,
        userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
        metadata: {
          statementChanged,
          experienceLevel: input.experienceLevel ?? null,
          regenerate: Boolean(input.regenerate),
        },
      },
    }).catch(() => undefined);

    const shouldRegen = input.regenerate === true && statementChanged;
    if (shouldRegen) {
      return this.regenerateGoal(userId, goalId);
    }

    return this.get(userId);
  }

  async save(userId: string, raw: unknown, req: { ip?: string; headers: Record<string, unknown> }) {
    const input = parseBody(onboardingSchema, raw);
    const primary = GOAL_CATALOG.find((item) => item.slug === input.primaryTarget);
    if (!primary) {
      throw new Error("catálogo inconsistente");
    }

    const knownTopics = [
      ...new Set(
        input.knownTopics.filter((slug) => slug !== input.primaryTarget && slug !== "custom"),
      ),
    ];

    const primaryLabel =
      primary.slug === "custom"
        ? input.statement.trim().slice(0, 80)
        : primary.label;

    const goalId = await this.prisma.$transaction(async (tx) => {
      // Não arquiva objectivos anteriores — cada um mantém o seu mapa isolado
      await tx.goal.updateMany({
        where: { userId },
        data: { isCurrent: false },
      });

      const goal = await tx.goal.create({
        data: {
          userId,
          statement: input.statement,
          status: "active",
          isCurrent: true,
          curriculumStatus: "generating",
          curriculumNote: "A preparar o mapa de estudo…",
          targets: {
            create: [
              { slug: primary.slug, label: primaryLabel, isPrimary: true },
              ...knownTopics.map((slug) => {
                const item = GOAL_CATALOG.find((entry) => entry.slug === slug);
                return {
                  slug,
                  label: item?.label ?? slug,
                  isPrimary: false,
                };
              }),
            ],
          },
        },
      });

      await tx.studyPreferences.upsert({
        where: { userId },
        create: {
          userId,
          experienceLevel: input.experienceLevel,
          weeklyHours: input.weeklyHours,
          sessionMinutes: input.sessionMinutes,
          prefersVideo: input.prefersVideo,
          prefersReading: input.prefersReading,
          prefersPractice: input.prefersPractice,
          knownTopics,
          onboardingCompletedAt: new Date(),
        },
        update: {
          experienceLevel: input.experienceLevel,
          weeklyHours: input.weeklyHours,
          sessionMinutes: input.sessionMinutes,
          prefersVideo: input.prefersVideo,
          prefersReading: input.prefersReading,
          prefersPractice: input.prefersPractice,
          knownTopics,
          onboardingCompletedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: "onboarding.save",
          entity: "goal",
          entityId: goal.id,
          ip: typeof req.ip === "string" ? req.ip : undefined,
          userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
          metadata: { primaryTarget: primary.slug, isolated: true },
        },
      });

      return goal.id;
    });

    // Geração em background — evita timeout/erro na UI ao criar outras matérias
    void this.curriculum.ensureForGoal(goalId).catch((error) => {
      // ensureForGoal já grava curriculumStatus=failed
      void error;
    });

    return this.get(userId);
  }
}

function serializeGoal(goal: {
  id: string;
  statement: string;
  status: string;
  updatedAt: Date;
  isCurrent?: boolean;
  tipNodeSlug?: string | null;
  curriculumStatus?: string;
  curriculumSource?: string | null;
  curriculumNote?: string | null;
  targets: Array<{ slug: string; label: string; isPrimary: boolean }>;
}) {
  const primary = goal.targets.find((target) => target.isPrimary);
  return {
    id: goal.id,
    statement: goal.statement,
    status: goal.status,
    isCurrent: Boolean(goal.isCurrent),
    tipNodeSlug: goal.tipNodeSlug ?? null,
    curriculumStatus: goal.curriculumStatus ?? "none",
    curriculumSource: goal.curriculumSource ?? null,
    curriculumNote: goal.curriculumNote ?? null,
    primaryTarget: primary ? { slug: primary.slug, label: primary.label } : null,
    targets: goal.targets.map((target) => ({
      slug: target.slug,
      label: target.label,
      isPrimary: target.isPrimary,
    })),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

function serializePreferences(prefs: {
  experienceLevel: string;
  weeklyHours: number;
  sessionMinutes: number;
  prefersVideo: boolean;
  prefersReading: boolean;
  prefersPractice: boolean;
  knownTopics: string[];
  onboardingCompletedAt: Date | null;
}) {
  return {
    experienceLevel: prefs.experienceLevel,
    weeklyHours: prefs.weeklyHours,
    sessionMinutes: prefs.sessionMinutes,
    prefersVideo: prefs.prefersVideo,
    prefersReading: prefs.prefersReading,
    prefersPractice: prefs.prefersPractice,
    knownTopics: prefs.knownTopics,
    onboardingCompletedAt: prefs.onboardingCompletedAt?.toISOString() ?? null,
  };
}
