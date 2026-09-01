import { redirect } from "next/navigation";
import { AgendaClient } from "@/components/agenda-client";
import { getCalendar } from "@/lib/calendar";
import { getOnboarding } from "@/lib/onboarding";
import { getSessionUser } from "@/lib/session";

export default async function AgendaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const onboarding = await getOnboarding();
  if (!onboarding?.complete) redirect("/onboarding");

  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString();
  const to = new Date(now.getTime() + 120 * 24 * 60 * 60_000).toISOString();
  const calendar = await getCalendar(from, to);

  return (
    <section className="stack study-home--calm">
      <p className="muted" style={{ margin: 0 }}>
        Plano até ao fim da matéria
      </p>
      <h1>Agenda</h1>
      <p className="muted">
        Diz quando comesças e quantas horas por dia. Calculamos o que estudar em cada data até
        acabares o mapa deste objectivo.
      </p>
      {!calendar ? (
        <p className="alert alert-error" role="status">
          Não foi possível ler a agenda.
        </p>
      ) : (
        <AgendaClient
          initialEvents={calendar.events}
          dueReviews={calendar.dueReviews}
          preferences={calendar.preferences}
          policy={calendar.policy}
        />
      )}
    </section>
  );
}
