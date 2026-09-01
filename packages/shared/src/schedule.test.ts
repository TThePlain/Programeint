import { describe, expect, it } from "vitest";
import { buildGoalSchedule } from "./calendar";

describe("buildGoalSchedule", () => {
  it("distribui nós por dias até acabar", () => {
    const start = new Date("2026-09-01T18:00:00.000Z");
    const nodes = [
      { slug: "a", title: "A", sortOrder: 1 },
      { slug: "b", title: "B", sortOrder: 2 },
      { slug: "c", title: "C", sortOrder: 3 },
      { slug: "d", title: "D", sortOrder: 4, status: "passed" },
    ];
    const result = buildGoalSchedule({
      startAt: start,
      dailyMinutes: 45,
      sessionMinutes: 45,
      nodes,
    });
    expect(result.slots).toHaveLength(3);
    expect(result.daysCount).toBe(3);
    expect(result.slots[0]?.nodeSlug).toBe("a");
    expect(result.slots[2]?.dayIndex).toBe(2);
  });

  it("mete várias etapas no mesmo dia se couberem", () => {
    const start = new Date("2026-09-01T18:00:00.000Z");
    const nodes = [
      { slug: "a", title: "A", sortOrder: 1 },
      { slug: "b", title: "B", sortOrder: 2 },
      { slug: "c", title: "C", sortOrder: 3 },
    ];
    const result = buildGoalSchedule({
      startAt: start,
      dailyMinutes: 90,
      sessionMinutes: 45,
      nodes,
    });
    expect(result.daysCount).toBe(2);
    expect(result.slots.filter((s) => s.dayIndex === 0)).toHaveLength(2);
  });
});
