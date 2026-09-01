"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      // Navegação de documento: apaga o estado do cliente com a sessão que deixou de existir.
      window.location.assign("/");
    } catch {
      setPending(false);
    }
  }

  return (
    <button
      className="btn btn-ghost"
      type="button"
      onClick={logout}
      disabled={pending}
      aria-label="Sair"
    >
      {pending ? "A sair…" : "Sair"}
    </button>
  );
}
