import { redirect } from "next/navigation";
import { DiagnosisClient } from "@/components/diagnosis-client";
import { GoalSwitcher } from "@/components/goal-switcher";
import { getOnboarding } from "@/lib/onboarding";
import { getSessionUser } from "@/lib/session";

export default async function DiagnosisPage() {
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
  }));

  return (
    <section className="card wide stack">
      <h1>Diagnóstico deste objectivo</h1>
      <p className="muted">
        Perguntas sobre o conteúdo do mapa activo
        {goal?.statement ? ` («${goal.statement}»)` : ""}
        . Não mistura outros objectivos nem pergunta só «como estudar».
      </p>
      <GoalSwitcher initialGoals={goals} />
      <DiagnosisClient key={goal?.id ?? "none"} />
    </section>
  );
}
