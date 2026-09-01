import Link from "next/link";
import { redirect } from "next/navigation";
import { CareerTrackPanel } from "@/components/career-track-panel";
import { CurriculumReadyPoller } from "@/components/curriculum-ready-poller";
import { GoalSwitcher } from "@/components/goal-switcher";
import { MapStudyPanel } from "@/components/map-study-panel";
import { StudyProgramPath } from "@/components/study-program-path";
import { getNextAction } from "@/lib/learning";
import { getOnboarding } from "@/lib/onboarding";
import { getRoadmap } from "@/lib/roadmap";
import { getSessionUser } from "@/lib/session";

export default async function RoadmapPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const onboarding = await getOnboarding();
  if (!onboarding?.complete) redirect("/onboarding");
  const [roadmap, next] = await Promise.all([getRoadmap(), getNextAction()]);

  const goals = (onboarding.goals ?? []).map((item) => ({
    id: item.id,
    statement: item.statement,
    isCurrent: Boolean(item.isCurrent),
    primaryTarget: item.primaryTarget,
    curriculumStatus: item.curriculumStatus,
    curriculumNote: item.curriculumNote ?? null,
  }));

  const generating = Boolean(
    roadmap?.generating || onboarding.goal?.curriculumStatus === "generating",
  );
  const career = roadmap?.career ?? null;

  if (!roadmap?.available) {
    const failed = onboarding.goal?.curriculumStatus === "failed";
    return (
      <section className="map-page map-page--empty card stack">
        <header className="map-page__intro">
          <h1 className="map-page__h1">Mapa de estudo</h1>
          <p className="muted">O mapa deste objectivo ainda não está pronto.</p>
        </header>
        <p className={generating ? "alert" : "alert alert-error"} role="status">
          {roadmap?.message ?? onboarding.goal?.curriculumNote ?? "Currículo indisponível."}
        </p>
        {generating ? (
          <CurriculumReadyPoller goalId={onboarding.goal?.id} active />
        ) : failed ? (
          <p className="muted">
            Usa «Regenerar mapa» no objectivo abaixo, ou apaga e cria de novo.
          </p>
        ) : (
          <Link className="btn btn-ghost" href="/onboarding">
            Voltar ao objectivo
          </Link>
        )}
        <GoalSwitcher initialGoals={goals} />
      </section>
    );
  }

  const studyHref =
    next?.kind === "study_module" || next?.kind === "study_continue"
      ? next.href
      : roadmap.recommendedStart?.slug
        ? `/estudar/${roadmap.recommendedStart.slug}`
        : "/estudar";

  const progressPct = roadmap.progress?.progressPct ?? 0;
  const studied = roadmap.progress?.studied ?? 0;
  const total = roadmap.progress?.total ?? roadmap.nodes?.length ?? 0;

  return (
    <section className="map-page">
      <header className="map-page__intro">
        <p className="map-page__eyebrow">{career ? "Carreira" : "Programa"}</p>
        <h1 className="map-page__h1">{career ? "Mapa de carreira" : "Mapa de estudo"}</h1>
        <p className="muted map-page__lede">
          {roadmap.goalStatement
            ? `Objectivo: ${roadmap.goalStatement}`
            : "Segue a sequência. Clica num nó para o conteúdo abaixo."}
        </p>
        <div className="map-page__cta">
          <Link className="btn btn-primary" href={studyHref}>
            Estudar agora
          </Link>
          <Link className="btn btn-ghost" href="/pratica">
            Prática
          </Link>
        </div>
      </header>

      <div className="map-page__progress" aria-label="Progresso no objectivo">
        <div className="map-page__progress-meta">
          <span>
            Progresso
            {total > 0 ? ` · ${studied}/${total} etapas` : null}
          </span>
          <strong>{progressPct}%</strong>
        </div>
        <div
          className="map-page__progress-track"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span className="map-page__progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="map-page__stage-wrap">
        <MapStudyPanel
          targetTitle={roadmap.target?.title ?? "Trilha"}
          targetSlug={roadmap.target?.slug ?? null}
          recommendedSlug={roadmap.recommendedStart?.slug ?? null}
          nodes={roadmap.nodes ?? []}
          canStudy
          progressPct={progressPct}
        />
      </div>

      <div className="map-page__goals">
        <GoalSwitcher initialGoals={goals} />
      </div>

      {next?.kind === "diagnosis_needed" || next?.kind === "diagnosis_continue" ? (
        <p className="muted map-page__hint">
          Opcional: <Link href="/diagnostico">diagnóstico</Link> para personalizar o ponto de
          partida — podes estudar o texto na mesma.
        </p>
      ) : next ? (
        <p className="muted map-page__hint">{next.message}</p>
      ) : null}

      <StudyProgramPath
        rail
        careerTrack={Boolean(career)}
        statement={roadmap.goalStatement}
        nodes={(roadmap.nodes ?? []).map((n) => ({
          slug: n.slug,
          title: n.title,
          status: n.status,
          sortOrder: n.sortOrder,
        }))}
      />

      {career ? (
        <details className="map-page__career">
          <summary>Sobre a carreira</summary>
          <div className="map-page__career-body">
            <CareerTrackPanel career={career} />
          </div>
        </details>
      ) : null}

      <nav className="map-page__links nav" aria-label="Atalhos">
        <Link className="btn btn-ghost" href="/biblioteca">
          Biblioteca
        </Link>
        <Link className="btn btn-ghost" href="/diagnostico">
          Diagnóstico
        </Link>
        <Link className="btn btn-ghost" href="/agenda">
          Agenda
        </Link>
      </nav>
    </section>
  );
}
