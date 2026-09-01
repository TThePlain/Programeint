import { cookies } from "next/headers";

const API = process.env.API_URL ?? "http://127.0.0.1:4000";

async function apiGet<T>(path: string): Promise<T | null> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
  try {
    const response = await fetch(`${API}${path}`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export type ProjectListItem = {
  slug: string;
  title: string;
  locked: boolean;
  missing: Array<{ slug: string; title: string }>;
  passed: boolean;
  passedAt: string | null;
  href: string;
};

export type EvidenceItem = {
  projectSlug: string;
  title: string;
  passedAt: string;
  href: string;
  summary: string;
};

export function getProjectList() {
  return apiGet<{ items: ProjectListItem[] }>("/api/projects");
}

export function getPortfolio() {
  return apiGet<{ items: EvidenceItem[] }>("/api/portfolio");
}
