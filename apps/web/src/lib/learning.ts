import { cookies } from "next/headers";

const API = process.env.API_URL ?? "http://127.0.0.1:4000";

export type NextActionView = {
  kind: string;
  href: string;
  label: string;
  message: string;
  nodeSlug?: string;
  nodeTitle?: string;
  question?: {
    id: string;
    nodeTitle: string;
    prompt: string;
    code: string | null;
    choices: Array<{ id: string; text: string }>;
  } | null;
  last?: { correct: boolean; explanation: string };
};

export async function getNextAction(): Promise<NextActionView | null> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
  try {
    const response = await fetch(`${API}/api/learning/next`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (response.status === 401) return null;
    if (!response.ok) {
      return {
        kind: "curriculum_unavailable",
        href: "/mapa",
        label: "Ver mapa",
        message: "Não foi possível calcular a próxima ação.",
      };
    }
    return (await response.json()) as NextActionView;
  } catch {
    return {
      kind: "curriculum_unavailable",
      href: "/mapa",
      label: "Ver mapa",
      message: "API indisponível.",
    };
  }
}
