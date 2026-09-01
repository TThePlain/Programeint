"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { loginAction, type LoginState } from "@/app/entrar/actions";

const REMEMBER_KEY = "programeint-remember-email";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    if (remember && email) window.localStorage.setItem(REMEMBER_KEY, email);
    else if (!remember) window.localStorage.removeItem(REMEMBER_KEY);
  }, [remember, email]);

  return (
    <form className="stack" action={formAction} noValidate>
      {state?.error ? (
        <p className="alert alert-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="login-email">E-mail</label>
        <div className="input-shell">
          <span className="input-shell__icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="login-password">Senha</label>
        <div className="input-shell">
          <span className="input-shell__icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Sua senha"
          />
          <button
            className="input-shell__action"
            type="button"
            aria-label={showPassword ? "Ocultar caracteres" : "Mostrar caracteres"}
            onClick={() => setShowPassword((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {showPassword ? (
                <path
                  d="M3 3l18 18M10.5 10.7a2.5 2.5 0 0 0 3.3 3.3M9.2 5.5A10 10 0 0 1 12 5c5 0 9 4.5 10 7-0.4 1-1.2 2.4-2.5 3.7M6.1 6.7C4.4 8 3.4 9.7 3 12c1 2.5 5 7 9 7 1.4 0 2.7-.3 3.9-.9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ) : (
                <>
                  <path
                    d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <div className="form-row">
        <label className="check">
          <input type="checkbox" name="remember" value="on" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Lembrar de mim
        </label>
        <Link className="link-quiet" href="/recuperar-senha">
          Esqueci minha senha
        </Link>
      </div>

      <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
        {pending ? "A entrar…" : "Entrar na plataforma"}
        {!pending ? <span aria-hidden="true">→</span> : null}
      </button>

      <div className="auth-divider" role="presentation">
        ou
      </div>

      <Link className="btn btn-ghost btn-block" href="/criar-conta">
        Criar conta grátis
      </Link>

      <p className="secure-note">Sessão segura · podes exportar ou apagar os dados em Conta.</p>
    </form>
  );
}
