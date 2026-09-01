import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  buildGoalSchedule,
  buildWeekPlan,
  completeCalendarEventSchema,
  createCalendarEventSchema,
  createScheduleSchema,
  markMissedIfNeeded,
  planWeekSchema,
  type CalendarEventStatus,
} from "@programeint/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseBody } from "../common/parse";
import {
  loadScopedGraph,
  resolveCurriculumContext,
} from "../curriculum/curriculum-context";

@Injectable()
export class CalendarService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private presentEvent(row: {
    id: string;
    kind: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    durationMinutes: number;
    status: string;
    source: string;
    focusedMinutes: number | null;
    notes: string | null;
    href: string | null;
    completedAt: Date | null;
  }) {
    const status = markMissedIfNeeded(row.status as CalendarEventStatus, row.endsAt);
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      durationMinutes: row.durationMinutes,
      status,
      source: row.source,
      focusedMinutes: row.focusedMinutes,
      notes: row.notes,
      href: row.href,
      completedAt: row.completedAt?.toISOString() ?? null,
    };
  }

  async list(userId: string, fromRaw?: string, toRaw?: string) {
    const now = new Date();
    const from = fromRaw ? new Date(fromRaw) : new Date(now.getTime() - 24 * 60 * 60_000);
    const to = toRaw ? new Date(toRaw) : new Date(now.getTime() + 14 * 24 * 60 * 60_000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException("Intervalo from/to inválido.");
    }
    if (to <= from) {
      throw new BadRequestException("O fim do intervalo tem de ser depois do início.");
    }
    if (to.getTime() - from.getTime() > 180 * 24 * 60 * 60_000) {
      throw new BadRequestException("Intervalo máximo: 180 dias.");
    }

    const [events, dueReviews, prefs] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where: {
          userId,
          startsAt: { lt: to },
          endsAt: { gt: from },
          status: { not: "cancelled" },
        },
        orderBy: { startsAt: "asc" },
      }),
      this.prisma.fsrsCard.findMany({
        where: { userId, due: { gte: from, lt: to } },
        orderBy: { due: "asc" },
        include: { question: { include: { node: true } } },
        take: 50,
      }),
      this.prisma.studyPreferences.findUnique({ where: { userId } }),
    ]);

    // Missed é estado derivado: se o fim já passou e ainda está planned, atualiza.
    const missedIds = events
      .filter((row) => markMissedIfNeeded(row.status as CalendarEventStatus, row.endsAt) === "missed")
      .filter((row) => row.status === "planned")
      .map((row) => row.id);
    if (missedIds.length > 0) {
      await this.prisma.calendarEvent.updateMany({
        where: { id: { in: missedIds }, userId },
        data: { status: "missed" },
      });
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      preferences: prefs
        ? {
            weeklyHours: prefs.weeklyHours,
            sessionMinutes: prefs.sessionMinutes,
          }
        : null,
      events: events.map((row) =>
        this.presentEvent({
          ...row,
          status: missedIds.includes(row.id) ? "missed" : row.status,
        }),
      ),
      dueReviews: dueReviews.map((card) => ({
        cardId: `${card.userId}:${card.questionId}`,
        due: card.due.toISOString(),
        nodeSlug: card.question.node.slug,
        nodeTitle: card.question.node.title,
        href: "/revisar",
        source: "fsrs" as const,
      })),
      policy:
        "Eventos são persistidos. Revisões FSRS aparecem como devidas reais, não como sessões inventadas. Lembretes push não estão configurados.",
    };
  }

  async create(userId: string, raw: unknown) {
    const input = parseBody(createCalendarEventSchema, raw);
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60_000);

    const row = await this.prisma.calendarEvent.create({
      data: {
        userId,
        kind: input.kind,
        title: input.title,
        startsAt,
        endsAt,
        durationMinutes: input.durationMinutes,
        notes: input.notes ?? null,
        href: input.href ?? null,
        source: "user",
        status: "planned",
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "calendar.event.create",
        entity: "calendar_events",
        entityId: row.id,
        metadata: { kind: row.kind, startsAt: row.startsAt.toISOString() },
      },
    });

    return this.presentEvent(row);
  }

  async complete(userId: string, id: string, raw: unknown) {
    const input = parseBody(completeCalendarEventSchema, raw ?? {});
    const row = await this.prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException("Sessão não encontrada.");
    if (row.status === "cancelled") {
      throw new ConflictException("Sessão cancelada não pode ser concluída.");
    }
    if (row.status === "completed") {
      return this.presentEvent(row);
    }

    const updated = await this.prisma.calendarEvent.update({
      where: { id },
      data: {
        status: "completed",
        completedAt: new Date(),
        focusedMinutes: input.focusedMinutes ?? row.durationMinutes,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "calendar.event.complete",
        entity: "calendar_events",
        entityId: id,
        metadata: { focusedMinutes: updated.focusedMinutes },
      },
    });

    return this.presentEvent(updated);
  }

  async cancel(userId: string, id: string) {
    const row = await this.prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException("Sessão não encontrada.");
    if (row.status === "completed") {
      throw new ConflictException("Sessão concluída não pode ser cancelada.");
    }
    if (row.status === "cancelled") return this.presentEvent(row);

    const updated = await this.prisma.calendarEvent.update({
      where: { id },
      data: { status: "cancelled" },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "calendar.event.cancel",
        entity: "calendar_events",
        entityId: id,
      },
    });

    return this.presentEvent(updated);
  }

  async planWeek(userId: string, raw: unknown) {
    const input = parseBody(planWeekSchema, raw);
    const prefs = await this.prisma.studyPreferences.findUnique({ where: { userId } });
    if (!prefs?.onboardingCompletedAt) {
      throw new ConflictException("Conclui o onboarding antes de planear a semana.");
    }

    const firstSlot = new Date(input.firstSlot);
    const weekEnd = new Date(firstSlot.getTime() + 7 * 24 * 60 * 60_000);

    const existing = await this.prisma.calendarEvent.findMany({
      where: {
        userId,
        status: { not: "cancelled" },
        startsAt: { gte: firstSlot, lt: weekEnd },
      },
      select: { startsAt: true },
    });

    const slots = buildWeekPlan({
      weeklyHours: prefs.weeklyHours,
      sessionMinutes: prefs.sessionMinutes,
      firstSlot,
      existingStarts: existing.map((row) => row.startsAt),
    });

    if (slots.length === 0) {
      return {
        created: [],
        message: "Já existem sessões nestes horários para esta semana.",
      };
    }

    const created = await this.prisma.$transaction(
      slots.map((slot) =>
        this.prisma.calendarEvent.create({
          data: {
            userId,
            kind: slot.kind,
            title: slot.title,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            durationMinutes: slot.durationMinutes,
            href: "/app",
            source: "plan",
            status: "planned",
          },
        }),
      ),
    );

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "calendar.plan_week",
        entity: "calendar_events",
        metadata: { count: created.length, firstSlot: firstSlot.toISOString() },
      },
    });

    return {
      created: created.map((row) => this.presentEvent(row)),
      message: `Foram agendadas ${created.length} sessões com base em ${prefs.weeklyHours} h/semana e ${prefs.sessionMinutes} min/sessão.`,
    };
  }

  /** Cronograma até acabar o mapa: início + minutos/dia → datas por etapa. */
  async createSchedule(userId: string, raw: unknown) {
    const input = parseBody(createScheduleSchema, raw);
    const prefs = await this.prisma.studyPreferences.findUnique({ where: { userId } });
    if (!prefs?.onboardingCompletedAt) {
      throw new ConflictException("Conclui o onboarding antes de criar o cronograma.");
    }

    const ctx = await resolveCurriculumContext(this.prisma, userId);
    if (!ctx.available) {
      throw new ConflictException(ctx.message ?? "Mapa indisponível para cronograma.");
    }

    const graph = await loadScopedGraph(this.prisma, ctx.scopeGoalId);
    const masteryRows = await this.prisma.nodeMastery.findMany({
      where: { userId, nodeId: { in: graph.nodes.map((n) => n.id) } },
    });
    const mastery = new Map(masteryRows.map((m) => [m.nodeId, m.status]));

    const nodes = [...graph.nodes]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((n) => ({
        slug: n.slug,
        title: n.title,
        status: mastery.get(n.id) ?? "unassessed",
        sortOrder: n.sortOrder,
      }));

    const startAt = new Date(input.startAt);
    const built = buildGoalSchedule({
      startAt,
      dailyMinutes: input.dailyMinutes,
      sessionMinutes: prefs.sessionMinutes,
      nodes,
    });

    if (built.slots.length === 0) {
      return {
        created: [],
        daysCount: 0,
        finishAt: null,
        message: "Não há etapas pendentes — o mapa deste objectivo já está concluído.",
      };
    }

    const marker = `schedule:${ctx.goal.id}`;
    await this.prisma.calendarEvent.updateMany({
      where: {
        userId,
        source: "plan",
        status: "planned",
        notes: { startsWith: marker },
      },
      data: { status: "cancelled" },
    });

    const created = await this.prisma.$transaction(
      built.slots.map((slot) =>
        this.prisma.calendarEvent.create({
          data: {
            userId,
            kind: "study",
            title: slot.title,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            durationMinutes: slot.durationMinutes,
            href: `/estudar/${slot.nodeSlug}`,
            notes: `${marker}|${slot.nodeSlug}|day:${slot.dayIndex}`,
            source: "plan",
            status: "planned",
          },
        }),
      ),
    );

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "calendar.schedule",
        entity: "calendar_events",
        metadata: {
          goalId: ctx.goal.id,
          count: created.length,
          daysCount: built.daysCount,
          dailyMinutes: input.dailyMinutes,
          startAt: startAt.toISOString(),
          finishAt: built.finishAt?.toISOString() ?? null,
        },
      },
    });

    return {
      created: created.map((row) => this.presentEvent(row)),
      daysCount: built.daysCount,
      finishAt: built.finishAt?.toISOString() ?? null,
      dailyMinutes: input.dailyMinutes,
      sessionMinutes: prefs.sessionMinutes,
      message: `Cronograma: ${built.slots.length} etapas em ${built.daysCount} dia(s), a ${input.dailyMinutes} min/dia.`,
    };
  }

  /** O que estudar hoje (pelo cronograma do objectivo em foco). */
  async today(userId: string, _dayRaw?: string) {
    const ctx = await resolveCurriculumContext(this.prisma, userId);
    const prefs = await this.prisma.studyPreferences.findUnique({ where: { userId } });

    if (!ctx.available) {
      return {
        available: false,
        date: new Date().toISOString().slice(0, 10),
        goal: null,
        preferences: prefs
          ? { weeklyHours: prefs.weeklyHours, sessionMinutes: prefs.sessionMinutes }
          : null,
        hasSchedule: false,
        items: [],
        focus: null,
        remainingToday: 0,
        finishAt: null,
        message: ctx.message ?? "Define um objectivo e gera o mapa para ter cronograma.",
      };
    }

    const marker = `schedule:${ctx.goal.id}`;
    const allSchedule = await this.prisma.calendarEvent.findMany({
      where: {
        userId,
        source: "plan",
        status: { not: "cancelled" },
        notes: { startsWith: marker },
      },
      orderBy: { startsAt: "asc" },
    });

    const first = allSchedule[0] ?? null;
    const last = allSchedule[allSchedule.length - 1] ?? null;
    const msPerDay = 24 * 60 * 60_000;
    const dayIndex = first
      ? Math.max(0, Math.floor((Date.now() - first.startsAt.getTime()) / msPerDay))
      : 0;

    const itemsToday = allSchedule.filter((row) => row.notes?.includes(`|day:${dayIndex}`));
    const focus =
      itemsToday.find((e) => e.status === "planned") ?? itemsToday[0] ?? null;
    const remaining = itemsToday.filter((e) => e.status === "planned").length;

    return {
      available: true,
      date: new Date().toISOString().slice(0, 10),
      dayIndex,
      goal: { id: ctx.goal.id, statement: ctx.goal.statement },
      preferences: prefs
        ? { weeklyHours: prefs.weeklyHours, sessionMinutes: prefs.sessionMinutes }
        : null,
      hasSchedule: allSchedule.length > 0,
      items: itemsToday.map((row) => this.presentEvent(row)),
      focus: focus
        ? {
            title: focus.title,
            href: focus.href ?? "/mapa",
            status: focus.status,
            startsAt: focus.startsAt.toISOString(),
            durationMinutes: focus.durationMinutes,
          }
        : null,
      remainingToday: remaining,
      finishAt: last?.endsAt.toISOString() ?? null,
      totalRemaining: allSchedule.filter((e) => e.status === "planned").length,
      message: !first
        ? "Ainda sem cronograma. Na Agenda indica quando comesças e quantas horas por dia — calculamos as datas até ao fim."
        : focus
          ? focus.status === "completed"
            ? `Já concluíste «${focus.title}» no plano de hoje.`
            : `Hoje estudas: «${focus.title}» (${focus.durationMinutes} min).`
          : dayIndex > (last ? Math.floor((last.startsAt.getTime() - first.startsAt.getTime()) / msPerDay) : 0)
            ? "O cronograma deste objectivo já passou do último dia. Regenera na Agenda se ainda houver etapas."
            : "Dia de descanso no cronograma (ou já concluíste as etapas de hoje).",
    };
  }
}
