"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API = process.env.API_URL ?? "http://127.0.0.1:4000";
const COOKIE = process.env.SESSION_COOKIE_NAME ?? "programeint_sid";

export type LoginState = {
  error?: string;
  code?: string;
} | null;

/**
 * Login no servidor: grava o cookie na resposta do Next e faz redirect.
 * Evita o falhanço da 1ª tentativa (fetch no browser + rewrite + assign).
 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";

  if (!email || !password) {
    return { error: "Indica o e-mail e a senha." };
  }

  let res: Response;
  try {
    res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch {
    return { error: "Não foi possível entrar. Tenta de novo." };
  }

  const body = (await res.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
  };

  if (!res.ok) {
    if (body.code === "EMAIL_NOT_VERIFIED") {
      redirect(`/verificar-email?email=${encodeURIComponent(email)}`);
    }
    return { error: body.message ?? "Não foi possível entrar.", code: body.code };
  }

  const setCookies =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const store = await cookies();
  let applied = false;

  for (const raw of setCookies) {
    const match = raw.match(new RegExp(`^${COOKIE}=([^;]+)`));
    if (!match?.[1]) continue;
    const maxAgeMatch = /Max-Age=(\d+)/i.exec(raw);
    store.set({
      name: COOKIE,
      value: decodeURIComponent(match[1]),
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: maxAgeMatch ? Number(maxAgeMatch[1]) : 60 * 60 * 24 * 7,
    });
    applied = true;
  }

  if (!applied) {
    return { error: "Sessão não foi criada. Tenta de novo." };
  }

  // Preferência "lembrar e-mail" fica no cliente (localStorage); o flag só sinaliza.
  void remember;

  redirect("/app");
}
