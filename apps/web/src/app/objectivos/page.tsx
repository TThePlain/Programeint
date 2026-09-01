import Link from "next/link";
import { redirect } from "next/navigation";
import { GoalSwitcher } from "@/components/goal-switcher";
import { GoalBanner } from "@/components/tech-mark";
import { getOnboarding } from "@/lib/onboarding";
import { getSessionUser } from "@/lib/session";

export default async function ObjectivosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const onboarding = await getOnboarding();
  if (!onboarding?.complete) redirect("/onboarding");

  const goal = onboarding.goal;
  const goals = (onboarding.goals ?? []).map((item) => ({
    id: item.id,
    statement: item.statement,
    isCurrent: Boolean(item.isCurrent),
    primaryTarget: item.primaryTarget,
    curriculumStatus: item.curriculumStatus,
    curriculumNote: item.curriculumNote ?? null,
  }));

  return (
    <section className="objectivos-page">
      <header className="objectivos-page__head">
        <p className="objectivos-page__eyebrow">Estudo</p>
        <h1 className="objectivos-page__title">Os teus objectivos</h1>
        <p className="muted objectivos-page__lede">
          Cada objectivo tem o seu mapa, prática e biblioteca — escolhe qual fica em foco.
        </p>
      </header>

      {goal?.statement ? (
        <GoalBanner
          statement={goal.statement}
          targetSlug={goal.primaryTarget?.slug}
          targetLabel={goal.primaryTarget?.label}
          eyebrow="Em foco agora"
          centered
        />
      ) : null}

      <article className="objectivos-page__list">
        <h2 className="objectivos-page__list-title">Lista de objectivos</h2>
        <p className="muted objectivos-page__list-hint">
          Clica num objectivo para o activar. Mapa, estudar e prática passam a ser só desse.
        </p>
        <GoalSwitcher initialGoals={goals} />
        <p className="nav objectivos-page__actions">
          <Link className="btn btn-primary" href="/onboarding">
            Novo objectivo
          </Link>
          <Link className="btn btn-ghost" href="/mapa">
            Abrir mapa
          </Link>
          <Link className="btn btn-ghost" href="/estudar">
            Estudar
          </Link>
        </p>
      </article>
    </section>
  );
}
