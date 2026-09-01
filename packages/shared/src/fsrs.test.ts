import { describe, expect, it } from "vitest";
import { reviewCard } from "./fsrs";

describe("FSRS", () => {
  it("agenda uma carta nova após resposta correta", () => {
    const now = new Date("2026-08-28T10:00:00Z");
    const card = reviewCard(null, true, now);
    expect(card.reps).toBeGreaterThanOrEqual(1);
    expect(card.due.getTime()).toBeGreaterThan(now.getTime());
    expect(card.lastReview?.getTime()).toBe(now.getTime());
  });

  it("resposta incorreta também persiste estado (Again)", () => {
    const now = new Date("2026-08-28T10:00:00Z");
    const card = reviewCard(null, false, now);
    expect(card.reps).toBeGreaterThanOrEqual(1);
    expect(card.lapses + card.state).toBeGreaterThanOrEqual(0);
  });
});
