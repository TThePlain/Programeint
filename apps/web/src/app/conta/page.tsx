import { redirect } from "next/navigation";
import { AccountClient } from "@/components/account-client";
import { LogoutButton } from "@/components/logout-button";
import { getSessionUser } from "@/lib/session";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export default async function ContaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");

  return (
    <section className="account-page">
      <div className="account-page__atmosphere" aria-hidden="true" />

      <header className="account-page__intro">
        <p className="account-page__eyebrow">Privacidade</p>
        <div className="account-page__avatar" aria-hidden="true">
          {initials(user.name)}
        </div>
        <h1 className="account-page__h1">A tua conta</h1>
        <p className="account-page__identity">
          <span className="account-page__name">{user.name}</span>
          <span className="account-page__email">{user.email}</span>
        </p>
        <p className="muted account-page__lede">
          Sessão, exportação dos teus dados e eliminação segura — sem atalhos.
        </p>
        <div className="account-page__actions">
          <LogoutButton />
        </div>
      </header>

      <AccountClient />
    </section>
  );
}
