"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApiError, api } from "@/lib/api";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      router.push(`/verificar-email?email=${encodeURIComponent(String(form.get("email") ?? ""))}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a conta.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="register-name">Nome</label>
        <div className="input-shell">
          <span className="input-shell__icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M5 19c1.5-3.2 4-5 7-5s5.5 1.8 7 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            id="register-name"
            name="name"
            autoComplete="name"
            required
            minLength={2}
            placeholder="O teu nome"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="register-email">E-mail</label>
        <div className="input-shell">
          <span className="input-shell__icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="seu@email.com"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="register-password">Senha</label>
        <div className="input-shell">
          <span className="input-shell__icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="register-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={10}
            placeholder="Mínimo 10 caracteres"
          />
          <button
            className="input-shell__action"
            type="button"
            aria-label={showPassword ? "Ocultar caracteres" : "Mostrar caracteres"}
            onClick={() => setShowPassword((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>

      <p className="muted">Mínimo 10 caracteres, com letras e números.</p>

      <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
        {pending ? "A criar…" : "Criar conta"}
        {!pending ? <span aria-hidden="true">→</span> : null}
      </button>

      <div className="auth-divider" role="presentation">
        ou
      </div>

      <Link className="btn btn-ghost btn-block" href="/entrar">
        Já tenho conta — Entrar
      </Link>

      <p className="secure-note">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Seus dados estão protegidos.
      </p>
    </form>
  );
}
