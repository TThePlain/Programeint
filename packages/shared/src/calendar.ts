import { z } from "zod";

export const CALENDAR_EVENT_KINDS = ["study", "review", "project", "custom"] as const;
export type CalendarEventKind = (typeof CALENDAR_EVENT_KINDS)[number];

export const CALENDAR_EVENT_STATUSES = ["planned", "completed", "cancelled", "missed"] as const;
export type CalendarEventStatus = (typeof CALENDAR_EVENT_STATUSES)[number];

export const CALENDAR_EVENT_SOURCES = ["user", "plan"] as const;
export type CalendarEventSource = (typeof CALENDAR_EVENT_SOURCES)[number];

export const createCalendarEventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "O título precisa de pelo menos 3 caracteres.")
    .max(120, "O título deve ter no máximo 120 caracteres."),
  kind: z.enum(CALENDAR_EVENT_KINDS).default("study"),
  startsAt: z
    .string()
    .datetime({ offset: true, message: "Indica o início em ISO-8601 com fuso." }),
  durationMinutes: z
    .number({ invalid_type_error: "Indica a duração em minutos." })
    .int()
    .min(15, "Sessão mínima: 15 minutos.")
    .max(180, "Sessão máxima: 180 minutos."),
  notes: z.string().trim().max(500).optional().nullable(),
  href: z
    .string()
    .trim()
    .max(200)
    .regex(/^\/[A-Za-z0-9\-/_[\].?=&%]*$/, "O link interno deve começar por /.")
    .optional()
    .nullable(),
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

export const completeCalendarEventSchema = z.object({
  focusedMinutes: z
    .number({ invalid_type_error: "Indica os minutos focados." })
    .int()
    .min(1, "Regista pelo menos 1 minuto focado.")
    .max(240, "Máximo 240 minutos focados.")
    .optional(),
});

export type CompleteCalendarEventInput = z.infer<typeof completeCalendarEventSchema>;

export const planWeekSchema = z.object({
  /**
   * Instantâneo do primeiro slot (ex.: segunda às 18:00 no fuso do aluno),
   * enviado já em ISO-8601 com offset. O servidor só soma dias — não inventa fuso.
   */
  firstSlot: z
    .string()
    .datetime({ offset: true, message: "Indica o primeiro slot em ISO-8601." }),
});

export type PlanWeekInput = z.infer<typeof planWeekSchema>;

/** Cronograma até acabar a matéria: data de início + minutos/dia. */
export const createScheduleSchema = z.object({
  /** Primeiro dia/hora de estudo no fuso do aluno (ISO com offset). */
  startAt: z
    .string()
    .datetime({ offset: true, message: "Indica o início em ISO-8601 com fuso." }),
  /** Minutos que vais estudar por dia (a plataforma calcula as datas). */
  dailyMinutes: z
    .number({ invalid_type_error: "Indica os minutos por dia." })
    .int()
    .min(15, "Mínimo 15 minutos por dia.")
    .max(480, "Máximo 8 horas por dia."),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;

export type ScheduleNodeInput = {
  slug: string;
  title: string;
  status?: string;
  sortOrder?: number;
};

export type ScheduleDaySlot = {
  dayIndex: number;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  nodeSlug: string;
  nodeTitle: string;
  title: string;
  kind: "study";
};

/**
 * Distribui os nós do mapa por dias até acabar a matéria.
 * Cada nó = 1 sessão (sessionMinutes). Quantas cabem por dia = dailyMinutes / sessionMinutes.
 */
export function buildGoalSchedule(input: {
  startAt: Date;
  dailyMinutes: number;
  sessionMinutes: number;
  nodes: ScheduleNodeInput[];
}): { slots: ScheduleDaySlot[]; finishAt: Date | null; daysCount: number } {
  const sessionMinutes = Math.max(15, Math.min(180, input.sessionMinutes));
  const perDay = Math.max(1, Math.floor(input.dailyMinutes / sessionMinutes));

  const pending = [...input.nodes]
    .filter((n) => !["studied", "passed"].includes(n.status ?? ""))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const slots: ScheduleDaySlot[] = [];
  let dayIndex = 0;
  let slotInDay = 0;

  for (const node of pending) {
    if (slotInDay >= perDay) {
      dayIndex += 1;
      slotInDay = 0;
    }
    const startsAt = new Date(input.startAt.getTime());
    startsAt.setUTCDate(startsAt.getUTCDate() + dayIndex);
    if (slotInDay > 0) {
      startsAt.setUTCMinutes(startsAt.getUTCMinutes() + slotInDay * sessionMinutes);
    }
    startsAt.setSeconds(0, 0);
    const endsAt = new Date(startsAt.getTime() + sessionMinutes * 60_000);
    slots.push({
      dayIndex,
      startsAt,
      endsAt,
      durationMinutes: sessionMinutes,
      nodeSlug: node.slug,
      nodeTitle: node.title,
      title: node.title,
      kind: "study",
    });
    slotInDay += 1;
  }

  const finishAt = slots.length > 0 ? slots[slots.length - 1]!.endsAt : null;
  return {
    slots,
    finishAt,
    daysCount: slots.length === 0 ? 0 : dayIndex + 1,
  };
}

export type PlanSlot = {
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  title: string;
  kind: "study";
};

/**
 * Distribui sessões reais pela semana com base nas preferências gravadas.
 * Não inventa horas semanais: usa weeklyHours e sessionMinutes do onboarding.
 */
export function buildWeekPlan(input: {
  weeklyHours: number;
  sessionMinutes: number;
  firstSlot: Date;
  existingStarts: Date[];
}): PlanSlot[] {
  const sessionMinutes = input.sessionMinutes;
  const maxByHours = Math.floor((input.weeklyHours * 60) / sessionMinutes);
  const count = Math.min(14, Math.max(1, maxByHours));

  const occupied = new Set(
    input.existingStarts.map((d) => {
      const copy = new Date(d);
      copy.setSeconds(0, 0);
      return copy.toISOString();
    }),
  );

  const slots: PlanSlot[] = [];
  for (let i = 0; i < count; i++) {
    const dayOffset = i % 7;
    const wave = Math.floor(i / 7);

    const startsAt = new Date(input.firstSlot.getTime());
    startsAt.setUTCDate(startsAt.getUTCDate() + dayOffset);
    if (wave > 0) {
      startsAt.setUTCHours(startsAt.getUTCHours() - wave * 2);
    }
    startsAt.setSeconds(0, 0);

    const key = startsAt.toISOString();
    if (occupied.has(key)) continue;
    occupied.add(key);

    const endsAt = new Date(startsAt.getTime() + sessionMinutes * 60_000);
    slots.push({
      startsAt,
      endsAt,
      durationMinutes: sessionMinutes,
      title: `Sessão de estudo ${slots.length + 1}`,
      kind: "study",
    });
  }

  return slots;
}

export function markMissedIfNeeded(status: CalendarEventStatus, endsAt: Date, now = new Date()) {
  if (status !== "planned") return status;
  if (endsAt < now) return "missed" as const;
  return status;
}
