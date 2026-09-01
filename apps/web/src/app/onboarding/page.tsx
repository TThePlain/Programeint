import Link from "next/link";
import { redirect } from "next/navigation";
import { GoalSwitcher } from "@/components/goal-switcher";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getOnboarding } from "@/lib/onboarding";
import { getSessionUser } from "@/lib/session";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/entrar");
  }
  const initial = await getOnboarding();
  const existingGoals = (initial?.goals ?? []).map((item) => ({
    id: item.id,
    statement: item.statement,
    isCurrent: Boolean(item.isCurrent),
    primaryTarget: item.primaryTarget,
    curriculumStatus: item.curriculumStatus,
    curriculumNote: item.curriculumNote ?? null,
  }));

  return (
    <section className="stack onboarding-page">
      {existingGoals.length > 0 ? (
        <article className="card wide stack">
          <h2 style={{ margin: 0 }}>Os teus objectivos</h2>
          <p className="muted" style={{ margin: 0 }}>
            Lista actual — podes activar um já existente ou criar um novo abaixo.
          </p>
          <GoalSwitcher initialGoals={existingGoals} />
          <p className="nav">
            <Link className="btn btn-ghost" href="/objectivos">
              Gerir objectivos
            </Link>
          </p>
        </article>
      ) : null}

      <section className="card wide stack">
        <OnboardingWizard initial={initial} />
      </section>
    </section>
  );
}
