import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkSimClient } from "@/components/work-sim-client";
import { getOnboarding } from "@/lib/onboarding";
import { getSessionUser } from "@/lib/session";

export default async function WorkSimPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const onboarding = await getOnboarding();
  if (!onboarding?.complete) redirect("/onboarding");

  return (
    <section className="card wide stack">
      <p className="muted" style={{ margin: 0 }}>
        Soft skills com evidência
      </p>
      <h1>Simulador de trabalho</h1>
      <p className="muted">
        Três rituais reais da carreira: daily, clarificar ticket, PR + review. Só sobre o objectivo
        em foco — sem misturar matérias.
      </p>
      <WorkSimClient />
      <p className="nav">
        <Link className="btn btn-ghost" href="/app">
          Início
        </Link>
        <Link className="btn btn-ghost" href="/mapa">
          Mapa
        </Link>
      </p>
    </section>
  );
}
