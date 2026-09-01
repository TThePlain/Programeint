import { cookies } from "next/headers";

const API = process.env.API_URL ?? "http://127.0.0.1:4000";

export type PracticeExercise = {
  slug: string;
  title: string;
  prompt: string;
  language: string;
  passed: boolean;
  node: { slug: string; title: string; summary: string; sortOrder: number };
};

export type PracticeList = {
  available: boolean;
  message?: string;
  goal?: {
    statement: string;
    primaryTarget?: { slug: string; label: string } | null;
  };
  exercises: PracticeExercise[];
};

export async function getPracticeList(): Promise<PracticeList | null> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
  try {
    const response = await fetch(`${API}/api/lab/practice`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (response.status === 401) return null;
    if (!response.ok) {
      return { available: false, message: "Não foi possível carregar a prática.", exercises: [] };
    }
    return (await response.json()) as PracticeList;
  } catch {
    return { available: false, message: "API indisponível.", exercises: [] };
  }
}
