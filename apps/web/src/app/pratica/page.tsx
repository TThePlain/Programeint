import Link from "next/link";
import { redirect } from "next/navigation";
import { GoalBanner } from "@/components/tech-mark";
import { getOnboarding } from "@/lib/onboarding";
import { getPracticeList } from "@/lib/practice";
import { getSessionUser } from "@/lib/session";

export default async function PraticaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const onboarding = await getOnboarding();
  if (!onboarding?.complete) redirect("/onboarding");

  const list = await getPracticeList();
  const goal = list?.goal ?? onboarding.goal;
  const primary = goal?.primaryTarget;
  const done = list?.exercises.filter((ex) => ex.passed).length ?? 0;
  const total = list?.exercises.length ?? 0;

  return (
    <section className="practice-page">
      <header className="practice-page__head">
        <p className="practice-page__eyebrow">Actividades do objectivo</p>
        <h1 className="practice-page__title">Prática e problemas</h1>
        <p className="muted practice-page__lede">
          Resolve, entrega evidência e sobe no mapa — só no objectivo em foco.
        </p>
      </header>

      {goal?.statement ? (
        <GoalBanner
          statement={goal.statement}
          targetSlug={primary?.slug}
          targetLabel={primary?.label}
          eyebrow="Objectivo desta prática"
        />
      ) : null}

      {list?.available && total > 0 ? (
        <div className="practice-stats" aria-label="Progresso da prática">
          <span>
            <strong>{done}</strong> de {total} concluídas
          </span>
          <span className="practice-stats__bar" aria-hidden>
            <span style={{ width: `${Math.round((done / total) * 100)}%` }} />
          </span>
        </div>
      ) : null}

      {!list?.available ? (
        <p className="alert" role="status">
          {list?.message ?? "Ainda sem mapa de prática. Abre o mapa ou regenera o objectivo."}
        </p>
      ) : list.exercises.length === 0 ? (
        <div className="practice-empty stack">
          <p className="muted">
            Este objectivo ainda não tem labs. Os mapas novos incluem prática em conceitos, padrões,
            prática guiada e projecto — podes regenerar o mapa em Conta / objectivo.
          </p>
          <p className="nav">
            <Link className="btn btn-primary" href="/mapa">
              Ir ao mapa
            </Link>
            <Link className="btn btn-ghost" href="/estudar">
              Estudar texto
            </Link>
          </p>
        </div>
      ) : (
        <ul className="practice-list">
          {list.exercises.map((ex, index) => (
            <li
              key={ex.slug}
              className={`practice-card${ex.passed ? " practice-card--done" : ""}`}
            >
              <div className="practice-card__index" aria-hidden>
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="practice-card__body">
                <p className="practice-card__meta">
                  <span className={`practice-pill${ex.passed ? " is-done" : ""}`}>
                    {ex.passed ? "Concluída" : "Por fazer"}
                  </span>
                  <span>{ex.node.title}</span>
                  {ex.language ? <span className="practice-lang">{ex.language}</span> : null}
                </p>
                <h2 className="practice-card__title">{ex.title}</h2>
                <p className="practice-card__prompt">{ex.prompt}</p>
                <p className="practice-card__actions nav">
                  <Link className="btn btn-primary" href={`/lab/${ex.slug}`}>
                    {ex.passed ? "Rever prática" : "Abrir IDE"}
                  </Link>
                  <Link className="btn btn-ghost" href={`/estudar/${ex.node.slug}`}>
                    Ler a etapa
                  </Link>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
