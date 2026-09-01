import { describe, expect, it } from "vitest";
import {
  DEV_CAREER_PROFILES,
  DEV_CAREER_STAGES,
  presentDevCareer,
  resolveDevCareer,
} from "./dev-career";

describe("dev career tracks", () => {
  it("Java inclui Spring Boot e soft skills", () => {
    const java = resolveDevCareer("java", "Quero ser backend Java");
    expect(java?.coreFramework.name).toMatch(/Spring Boot/i);
    expect(java?.complementary.some((c) => /SQL|REST|Docker/i.test(c.name))).toBe(true);
    expect(java?.softSkills.length).toBeGreaterThan(3);
    expect(java?.meetings.some((m) => /stand/i.test(m.name))).toBe(true);
    expect(java?.fullStackPath.length).toBeGreaterThanOrEqual(3);
  });

  it("resolve por statement quando slug é custom", () => {
    const profile = resolveDevCareer("custom", "Quero aprender Spring Boot e Java full stack");
    expect(profile?.slug).toBe("java");
  });

  it("programa de carreira tem 11 etapas", () => {
    expect(DEV_CAREER_STAGES).toHaveLength(11);
    expect(DEV_CAREER_STAGES.map((s) => s.key)).toContain("soft-skills");
    expect(DEV_CAREER_STAGES.map((s) => s.key)).toContain("carreira-realidade");
    expect(DEV_CAREER_STAGES.map((s) => s.key)).toContain("stack-framework");
  });

  it("presentDevCareer exporta resumo estável", () => {
    const view = presentDevCareer(DEV_CAREER_PROFILES.python!);
    expect(view.roleTitle).toBeTruthy();
    expect(view.whatYouDo.length).toBeGreaterThan(0);
  });
});
