import { cookies } from "next/headers";
import type { PublicUser } from "./api";

const API = process.env.API_URL ?? "http://127.0.0.1:4000";

export async function getSessionUser(): Promise<PublicUser | null> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  try {
    const response = await fetch(`${API}/api/auth/session`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { user: PublicUser | null };
    return data.user;
  } catch {
    // API indisponível: trata como sessão ausente em vez de rebentar o render.
    return null;
  }
}
