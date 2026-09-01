"use client";

import { FormEvent, useState } from "react";
import { ApiError, api } from "@/lib/api";

export function VerifyEmailForm({ initialToken, email }: { initialToken: string; email: string }) {
  const [token, setToken] = useState(initialToken);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await api<{ message: string }>("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível verificar.");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setPending(true);
    setError(null);
    try {
      const result = await api<{ message: string }>("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível reenviar.");
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
          {message} {message.includes("entrar") ? <a href="/entrar">Entrar</a> : null}
        </p>
      ) : null}
      <label>
        Código de verificação
        <input value={token} onChange={(e) => setToken(e.target.value)} name="token" required />
      </label>
      <p className="muted">
        Abrimos o link do e-mail automaticamente quando vens de lá. Também podes colar o token.
      </p>
      <button className="btn btn-primary" type="submit" disabled={pending || !token}>
        {pending ? "A confirmar…" : "Confirmar e-mail"}
      </button>
      {email ? (
        <button className="btn btn-ghost" type="button" onClick={resend} disabled={pending}>
          Reenviar e-mail
        </button>
      ) : null}
    </form>
  );
}
