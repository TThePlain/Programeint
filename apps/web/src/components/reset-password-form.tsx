"use client";

import { FormEvent, useState } from "react";
import { ApiError, api } from "@/lib/api";

export function ResetPasswordForm({ initialToken }: { initialToken: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: String(form.get("token") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="alert alert-ok" role="status">
          {message} <a href="/entrar">Entrar</a>
        </p>
      ) : null}
      <input type="hidden" name="token" defaultValue={initialToken} />
      <label>
        Nova senha
        <input name="password" type="password" autoComplete="new-password" required minLength={10} />
      </label>
      <button className="btn btn-primary" type="submit" disabled={pending || !initialToken}>
        {pending ? "A guardar…" : "Guardar senha"}
      </button>
    </form>
  );
}
