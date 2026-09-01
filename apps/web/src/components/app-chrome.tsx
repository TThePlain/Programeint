"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";

const AUTH_PREFIXES = [
  "/entrar",
  "/criar-conta",
  "/recuperar-senha",
  "/redefinir-senha",
  "/verificar-email",
];

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isAuth = AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isLand = pathname === "/";
  const isIde = pathname.startsWith("/lab/");
  const flush = isAuth || isIde || isLand;

  return (
    <>
      {isAuth || isLand ? null : <SiteHeader />}
      <main id="conteudo" className={flush ? "main main--flush" : "main"}>
        {children}
      </main>
      {isAuth || isLand || isIde ? null : (
        <footer className="footer">
          Tecnologia · programação · IA · mercado tech ·{" "}
          <a href="/contribuir">open source</a>
        </footer>
      )}
    </>
  );
}
