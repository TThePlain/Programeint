import { cookies } from "next/headers";

const API = process.env.API_URL ?? "http://127.0.0.1:4000";

export type GithubStatus = {
  configured: boolean;
  connected: boolean;
  login: string | null;
  canPublish: boolean;
  errorCode: string | null;
  message: string;
};

export async function getGithubStatus(): Promise<GithubStatus | null> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
  try {
    const response = await fetch(`${API}/api/github/status`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as GithubStatus;
  } catch {
    return null;
  }
}
