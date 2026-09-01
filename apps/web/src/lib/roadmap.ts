import { cookies } from "next/headers";

const API = process.env.API_URL ?? "http://127.0.0.1:4000";

export type CareerTrackView = {
  slug: string;
  roleTitle: string;
  careerType: string;
  whatItsLike: string;
  whatYouDo: string[];
  meetings: Array<{ name: string; purpose: string }>;
  softSkills: Array<{ name: string; how: string }>;
  coreFramework: { name: string; why: string };
  complementary: Array<{ name: string; why: string }>;
  fullStackPath: Array<{ layer: string; items: string; why: string }>;
  workTools: Array<{ name: string; why: string }>;
};

export type RoadmapView = {
  available: boolean;
  message?: string;
  generating?: boolean;
  diagnosisCompleted?: boolean;
  diagnosisInProgress?: boolean;
  target?: { slug: string; title: string };
  goalStatement?: string;
  curriculumSource?: string | null;
  curriculumNote?: string | null;
  career?: CareerTrackView | null;
  progress?: { studied: number; total: number; progressPct: number };
  recommendedStart?: { slug: string; title: string; status: string } | null;
  nodes?: Array<{
    slug: string;
    title: string;
    summary: string;
    status: string;
    area?: string;
    sortOrder?: number;
    hasModule?: boolean;
    labSlug?: string | null;
    videoCount?: number;
    modulePreview?: string | null;
    prerequisites: Array<{ slug: string; nature: string }>;
  }>;
};

export async function getRoadmap(): Promise<RoadmapView | null> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
  try {
    const response = await fetch(`${API}/api/roadmap`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (response.status === 401) return null;
    if (!response.ok) return { available: false, message: "Não foi possível ler o mapa." };
    return (await response.json()) as RoadmapView;
  } catch {
    return { available: false, message: "API indisponível." };
  }
}

export type ModulePreview = {
  node: { slug: string; title: string; summary: string };
  module: {
    slug: string;
    title: string;
    summary: string;
    body: string;
    preview: string;
  };
  resources: Array<{
    slug: string;
    title: string;
    url: string;
    publisher: string;
    kind: string;
    summary: string;
  }>;
  videoCount: number;
  goal: { statement: string; primaryLabel: string | null };
};

export async function getModulePreview(nodeSlug: string): Promise<ModulePreview | null> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
  try {
    const response = await fetch(
      `${API}/api/learning/modules/${encodeURIComponent(nodeSlug)}`,
      { headers: { cookie: cookieHeader }, cache: "no-store" },
    );
    if (!response.ok) return null;
    return (await response.json()) as ModulePreview;
  } catch {
    return null;
  }
}
