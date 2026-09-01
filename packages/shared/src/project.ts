import type { MasteryStatus } from "./diagnosis";

export type ProjectCandidate = {
  slug: string;
  title: string;
  requiredNodeIds: string[];
};

export function recommendedProject(input: {
  projects: ProjectCandidate[];
  mastery: Record<string, MasteryStatus>;
  passedProjectSlugs: Set<string>;
}): { slug: string; title: string } | null {
  for (const project of input.projects) {
    if (input.passedProjectSlugs.has(project.slug)) continue;
    const ready = project.requiredNodeIds.every((id) => {
      const status = input.mastery[id] ?? "unassessed";
      return status === "studied" || status === "passed";
    });
    if (ready) return { slug: project.slug, title: project.title };
  }
  return null;
}
