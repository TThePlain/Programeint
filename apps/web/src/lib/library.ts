import { cookies } from "next/headers";

const API = process.env.API_URL ?? "http://127.0.0.1:4000";

export type LibraryItem = {
  slug: string;
  title: string;
  url: string;
  publisher: string;
  kind: string;
  language: string;
  summary: string;
  license: {
    id: string;
    label: string;
    url: string | null;
    redistributable: boolean;
  };
  nodes: Array<{ slug: string; title: string }>;
  lastCheckedAt: string | null;
  lastStatus: number | null;
};

export type LibraryView = {
  policy: string;
  items: LibraryItem[];
  message?: string;
  filterNode?: { slug: string; title: string };
  goal?: {
    available: boolean;
    statement?: string;
    primaryTarget?: { slug: string; label: string } | null;
    curriculumSource?: string | null;
    message?: string;
    generating?: boolean;
  };
};

export async function getLibrary(nodeSlug?: string): Promise<LibraryView | null> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  const query = nodeSlug ? `?node=${encodeURIComponent(nodeSlug)}` : "";
  try {
    const response = await fetch(`${API}/api/library${query}`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as LibraryView;
  } catch {
    return null;
  }
}
