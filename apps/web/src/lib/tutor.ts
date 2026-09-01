import { cookies } from "next/headers";

const API = process.env.API_URL ?? "http://127.0.0.1:4000";

export type TutorMessage = {
  id: string;
  role: string;
  content: string;
  helpLevel: number | null;
  createdAt: string;
};

export type TutorThread = {
  configured: boolean;
  model: string | null;
  errorCode: string | null;
  message: string;
  hasLab?: boolean;
  node: { slug: string; title: string };
  messages: TutorMessage[];
};

export async function getTutorThread(nodeSlug: string): Promise<TutorThread | null> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  try {
    const response = await fetch(`${API}/api/tutor/threads/${nodeSlug}`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as TutorThread;
  } catch {
    return null;
  }
}
