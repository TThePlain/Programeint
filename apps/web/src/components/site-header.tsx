"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type PublicUser } from "@/lib/api";

/** Só navegação — sem marca/logo no topo. */
const NAV_LINKS = [
  { href: "/estudar", label: "Estudar", match: (p: string) => p === "/estudar" || p.startsWith("/estudar/") },
  { href: "/pratica", label: "Prática", match: (p: string) => p === "/pratica" || p.startsWith("/lab/") },
  { href: "/mapa", label: "Mapa", match: (p: string) => p === "/mapa" || p.startsWith("/mapa/") },
  { href: "/forum", label: "Fórum", match: (p: string) => p.startsWith("/forum") },
  { href: "/news", label: "News", match: (p: string) => p.startsWith("/news") },
  { href: "/objectivos", label: "Objectivos", match: (p: string) => p.startsWith("/objectivos") || p.startsWith("/onboarding") },
  { href: "/biblioteca", label: "Biblioteca", match: (p: string) => p.startsWith("/biblioteca") },
  { href: "/app", label: "Hoje", match: (p: string) => p === "/app" },
] as const;

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    api<{ user: PublicUser | null }>("/api/auth/session")
      .then((session) => {
        if (!cancelled) setUser(session.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="top">
      <nav className="nav" aria-label="Principal">
        {user ? (
          <>
            {NAV_LINKS.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={active ? "is-active" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/conta"
              aria-current={pathname.startsWith("/conta") ? "page" : undefined}
              className={pathname.startsWith("/conta") ? "is-active" : undefined}
            >
              Conta
            </Link>
          </>
        ) : (
          <>
            <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
              Início
            </Link>
            <Link
              href="/news"
              aria-current={pathname.startsWith("/news") ? "page" : undefined}
              className={pathname.startsWith("/news") ? "is-active" : undefined}
            >
              News
            </Link>
            <Link
              href="/contribuir"
              aria-current={pathname.startsWith("/contribuir") ? "page" : undefined}
              className={pathname.startsWith("/contribuir") ? "is-active" : undefined}
            >
              Contribuir
            </Link>
            <Link href="/entrar" aria-current={pathname.startsWith("/entrar") ? "page" : undefined}>
              Entrar
            </Link>
            {user === null ? (
              <Link className="btn btn-primary" href="/criar-conta">
                Criar conta
              </Link>
            ) : null}
          </>
        )}
      </nav>
    </header>
  );
}
