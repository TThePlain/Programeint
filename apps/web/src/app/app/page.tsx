import Link from "next/link";
import { redirect } from "next/navigation";
import {
  EXPERIENCE_LEVEL_LABEL,
  presentDevCareer,
  resolveDevCareer,
} from "@programeint/shared";
import { CareerTrackPanel } from "@/components/career-track-panel";
import { EvolutionChart } from "@/components/evolution-chart";
import { GoalSwitcher } from "@/components/goal-switcher";
import { GoalBanner } from "@/components/tech-mark";
import { StudyProgramPath } from "@/components/study-program-path";
import { TodayFocus } from "@/components/today-focus";
import { getTodaySchedule } from "@/lib/calendar";
import { getNextAction } from "@/lib/learning";
import { getOnboarding } from "@/lib/onboarding";
import { getPracticeList } from "@/lib/practice";
import { getRoadmap } from "@/lib/roadmap";
import { getSessionUser } from "@/lib/session";

export default async function AppHomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");

  const onboarding = await getOnboarding();
  if (!onboarding?.complete) redirect("/onboarding");

  const goal = onboarding.goal;
  const prefs = onboarding.preferences;
  const [next, roadmap, today, practice] = await Promise.all([
    getNextAction(),
    getRoadmap(),
    getTodaySchedule(),
    getPracticeList(),
  ]);
  const needsDiagnosis =
    next?.kind === "diagnosis_needed" || next?.kind === "diagnosis_continue";
  const level = prefs?.experienceLevel as keyof typeof EXPERIENCE_LEVEL_LABEL | undefined;
  const careerFromGoal = resolveDevCareer(goal?.primaryTarget?.slug, goal?.statement);
  const career =
    roadmap?.career ?? (careerFromGoal ? presentDevCareer(careerFromGoal) : null);

  const pendingPractice = practice?.exercises?.find((e) => !e.passed);
  const studyHref =
    next?.kind === "lab_exercise"
      ? next.href
      : needsDiagnosis
        ? "/diagnostico"
        : (today?.focus?.href ?? next?.href ?? "/estudar");

  const goals = (onboarding.goals ?? []).map((item) => ({
    id: item.id,
    statement: item.statement,
    isCurrent: Boolean(item.isCurrent),
    primaryTarget: item.primaryTarget,
    curriculumStatus: item.curriculumStatus,
    curriculumNote: item.curriculumNote ?? null,
  }));

  return (
    <section className="study-home">
      <header className="study-home__intro">
        <p className="study-home__hello">Olá, {user.name}</p>
        <h1 className="study-home__h1">O teu estudo de hoje</h1>
        <p className="muted study-home__lede">
          Um caminho simples: estudar, praticar e ver o mapa do objectivo em foco.
        </p>
      </header>

      <nav className="path-strip" aria-label="Caminho rápido">
        <Link className="path-strip__item" href={studyHref}>
          <span className="path-strip__n">1</span>
          <span>
            <strong>Estudar</strong>
            <span className="path-strip__hint">texto e verificação</span>
          </span>
        </Link>
        <Link
          className="path-strip__item"
          href={pendingPractice ? `/lab/${pendingPractice.slug}` : "/pratica"}
        >
          <span className="path-strip__n">2</span>
          <span>
            <strong>Praticar</strong>
            <span className="path-strip__hint">problemas do objectivo</span>
          </span>
        </Link>
        <Link className="path-strip__item" href="/mapa">
          <span className="path-strip__n">3</span>
          <span>
            <strong>Mapa</strong>
            <span className="path-strip__hint">ver a sequência</span>
          </span>
        </Link>
      </nav>

      <div className="study-home__block">
        <TodayFocus
          today={today}
          nextHref={needsDiagnosis ? "/diagnostico" : next?.href}
          nextLabel={
            needsDiagnosis
              ? "Diagnóstico"
              : next?.kind === "lab_exercise"
                ? "Praticar agora"
                : next?.label
          }
        />
      </div>

      {pendingPractice ? (
        <aside className="practice-callout study-home__block">
          <p className="practice-callout__label">Prática pendente</p>
          <h2 className="practice-callout__title">{pendingPractice.title}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {pendingPractice.prompt}
          </p>
          <p className="nav study-home__actions">
            <Link className="btn btn-primary" href={`/lab/${pendingPractice.slug}`}>
              Resolver problema
            </Link>
            <Link className="btn btn-ghost" href="/pratica">
              Ver todas
            </Link>
          </p>
        </aside>
      ) : null}

      <div className="study-home__block study-home__block--progress">
        <EvolutionChart hero />
      </div>

      <article className="study-home__panel">
        <header className="study-home__panel-head">
          <h2 className="study-home__panel-title">Objectivo em foco</h2>
          <p className="muted study-home__panel-hint">
            {level ? (
              <>
                Nível: <strong>{EXPERIENCE_LEVEL_LABEL[level]}</strong>
                {" · "}
              </>
            ) : null}
            Ritmo: {prefs?.weeklyHours} h/semana · sessões de {prefs?.sessionMinutes} min.
          </p>
        </header>

        {goal?.statement ? (
          <GoalBanner
            statement={goal.statement}
            targetSlug={goal.primaryTarget?.slug}
            targetLabel={goal.primaryTarget?.label}
            compact
            centered
          />
        ) : null}

        <div className="study-home__goals">
          <h3 className="study-home__subhead">Lista de objectivos</h3>
          <GoalSwitcher initialGoals={goals} />
        </div>

        <p className="nav study-home__actions">
          <Link className="btn btn-primary" href="/objectivos">
            Gerir objectivos
          </Link>
          <Link className="btn btn-ghost" href="/onboarding">
            Novo objectivo
          </Link>
          <Link className="btn btn-ghost" href="/mapa">
            Mapa
          </Link>
        </p>
      </article>

      <details className="study-home__more">
        <summary>Programa e carreira</summary>
        <div className="stack study-home__more-body">
          <StudyProgramPath
            careerTrack={Boolean(career)}
            statement={goal?.statement}
            nodes={roadmap?.nodes?.map((n) => ({
              slug: n.slug,
              title: n.title,
              status: n.status,
              sortOrder: n.sortOrder,
            }))}
          />
          {career ? <CareerTrackPanel career={career} /> : null}
          <EvolutionChart />
        </div>
      </details>
    </section>
  );
}
