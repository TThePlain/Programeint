"use client";

import Image from "next/image";
import Link from "next/link";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="auth-shell">
      <div className="auth-shell__bg" aria-hidden="true">
        <span className="auth-shell__glow auth-shell__glow--a" />
        <span className="auth-shell__glow auth-shell__glow--b" />
      </div>

      <div className="auth-shell__grid">
        <aside className="auth-hero" aria-label="Identidade">
          <div className="auth-hero__visual" aria-hidden="true">
            <span className="auth-hero__halo" />
            <Image
              className="auth-hero__plant"
              src="/brand/hero-plant.png?v=sprout-project-2"
              alt=""
              width={1024}
              height={944}
              priority
              unoptimized
            />
          </div>

          <div className="auth-hero__copy">
            <p className="brand-wm brand-wm--auth">
              <span className="brand-wm__name" aria-label="Programeint">
                <span className="brand-wm__program">Program</span>
                <span className="brand-wm__e">e</span>
                <span className="brand-wm__int">int</span>
              </span>
            </p>
            <h1 className="auth-hero__title">
              O teu mapa de estudo,
              <span className="auth-hero__title-accent"> sempre contigo.</span>
            </h1>
            <p className="auth-hero__lede">
              Continua a trilha activa — programação, IA e prática com evidência.
            </p>
            <p className="auth-hero__oss">
              <span className="auth-hero__oss-mark">open source</span>
              <Link href="/contribuir">Contribui para melhorar</Link>
            </p>
          </div>
        </aside>

        <section className="auth-card stack" aria-label={title}>
          <header className="auth-card__head">
            <p className="auth-card__eyebrow">Sessão</p>
            <h2 className="auth-card__title">{title}</h2>
            <p className="auth-card__subtitle">{subtitle}</p>
          </header>
          {children}
          <p className="auth-card__foot muted">
            <Link className="link-quiet" href="/">
              ← Voltar ao início
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
