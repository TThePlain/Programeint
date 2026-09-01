import { redirect } from "next/navigation";
import { ReviewClient } from "@/components/review-client";
import { getOnboarding } from "@/lib/onboarding";
import { getSessionUser } from "@/lib/session";

export default async function ReviewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const onboarding = await getOnboarding();
  if (!onboarding?.complete) redirect("/onboarding");

  return (
    <section className="card wide stack">
      <h1>Revisão</h1>
      <p className="muted">
        Intervalos calculados com FSRS. Acertar numa revisão não substitui prática com código.
      </p>
      <ReviewClient />
    </section>
  );
}
