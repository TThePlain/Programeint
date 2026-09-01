import { describe, expect, it } from "vitest";
import {
  buildWeekPlan,
  createCalendarEventSchema,
  markMissedIfNeeded,
} from "./calendar";

describe("calendar plan", () => {
  it("cria sessões a partir de horas semanais reais", () => {
    const firstSlot = new Date("2026-08-31T18:00:00.000Z");
    const slots = buildWeekPlan({
      weeklyHours: 3,
      sessionMinutes: 45,
      firstSlot,
      existingStarts: [],
    });
    expect(slots).toHaveLength(4);
    expect(slots[0]?.durationMinutes).toBe(45);
    expect(slots[0]?.startsAt.toISOString()).toBe("2026-08-31T18:00:00.000Z");
    expect(slots[1]?.startsAt.toISOString()).toBe("2026-09-01T18:00:00.000Z");
  });

  it("não duplica horários já ocupados", () => {
    const firstSlot = new Date("2026-08-31T18:00:00.000Z");
    const existing = [new Date("2026-08-31T18:00:00.000Z")];
    const slots = buildWeekPlan({
      weeklyHours: 1,
      sessionMinutes: 60,
      firstSlot,
      existingStarts: existing,
    });
    expect(slots.every((s) => s.startsAt.toISOString() !== existing[0]!.toISOString())).toBe(true);
  });

  it("marca planned como missed depois do fim", () => {
    expect(
      markMissedIfNeeded("planned", new Date("2026-01-01T00:00:00.000Z"), new Date("2026-01-02")),
    ).toBe("missed");
    expect(
      markMissedIfNeeded("completed", new Date("2026-01-01T00:00:00.000Z"), new Date("2026-01-02")),
    ).toBe("completed");
  });
});

describe("calendar schemas", () => {
  it("exige ISO com fuso e duração válida", () => {
    const ok = createCalendarEventSchema.safeParse({
      title: "Estudar Java",
      startsAt: "2026-08-29T18:00:00.000Z",
      durationMinutes: 45,
      href: "/estudar/java",
    });
    expect(ok.success).toBe(true);

    const bad = createCalendarEventSchema.safeParse({
      title: "ab",
      startsAt: "amanhã",
      durationMinutes: 5,
    });
    expect(bad.success).toBe(false);
  });
});
