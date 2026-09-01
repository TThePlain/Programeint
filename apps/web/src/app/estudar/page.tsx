import Link from "next/link";
import { redirect } from "next/navigation";
import { getNextAction } from "@/lib/learning";
import { getOnboarding } from "@/lib/onboarding";
import { getRoadmap } from "@/lib/roadmap";
import { getSessionUser } from "@/lib/session";

/**
 * Hub «Estudar»: próximo módulo — ou lab se a próxima acção for prática.
 */
export default async function StudyHubPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const onboarding = await getOnboarding();
  if (!onboarding?.complete) redirect("/onboarding");

  const [next, roadmap] = await Promise.all([getNextAction(), getRoadmap()]);

  if (next?.kind === "lab_exercise" && next.href.startsWith("/lab/")) {
    redirect(next.href);
  }

  const studyHref =
    next?.kind === "study_module" || next?.kind === "study_continue"
      ? next.href
      : next?.nodeSlug
        ? `/estudar/${next.nodeSlug}`
        : roadmap?.recommendedStart?.slug
          ? `/estudar/${roadmap.recommendedStart.slug}`
          : null;

  if (studyHref?.startsWith("/estudar/") && studyHref !== "/estudar") {
    redirect(studyHref);
  }

  const firstWithModule = roadmap?.nodes?.find((n) => n.hasModule)?.slug;
  if (firstWithModule) {
    redirect(`/estudar/${firstWithModule}`);
  }

  return (
    <section className="lesson-page">
      <h1 className="lesson-shell__title">Estudar</h1>
      <p className="muted">
        {roadmap?.generating
          ? "O mapa deste objectivo ainda está a ser gerado. Volta daqui a pouco."
          : "Ainda não há módulo pronto. Abre o mapa e escolhe uma etapa."}
      </p>
      <p className="nav">
        <Link className="btn btn-primary" href="/mapa">
          Ir ao mapa
        </Link>
        <Link className="btn btn-ghost" href="/pratica">
          Prática
        </Link>
      </p>
    </section>
  );
}
