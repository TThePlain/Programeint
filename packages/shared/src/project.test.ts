import { describe, expect, it } from "vitest";
import { recommendedProject } from "./project";

describe("recommendedProject", () => {
  const projects = [
    {
      slug: "java-catalog",
      title: "Catálogo de tarefas",
      requiredNodeIds: ["algo", "java"],
    },
  ];

  it("só recomenda quando todos os nós exigidos estão studied ou passed", () => {
    expect(
      recommendedProject({
        projects,
        mastery: { algo: "studied", java: "failed" },
        passedProjectSlugs: new Set(),
      }),
    ).toBeNull();
    expect(
      recommendedProject({
        projects,
        mastery: { algo: "studied", java: "passed" },
        passedProjectSlugs: new Set(),
      }),
    ).toEqual({ slug: "java-catalog", title: "Catálogo de tarefas" });
  });

  it("não volta a recomendar um projeto já passado", () => {
    expect(
      recommendedProject({
        projects,
        mastery: { algo: "studied", java: "studied" },
        passedProjectSlugs: new Set(["java-catalog"]),
      }),
    ).toBeNull();
  });
});
