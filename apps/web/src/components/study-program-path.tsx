"use client";

import { DEV_CAREER_STAGES, STUDY_PROGRAM_STAGES } from "@programeint/shared";

type NodeLite = {
  slug: string;
  title: string;
  status?: string;
  sortOrder?: number;
};

type StageLite = { key: string; label: string; role: string };

/**
 * Programa de estudo em sequência (metodologia).
 * Um objectivo = um programa — sem misturar matérias.
 * Carreira de programador usa etapas alargadas (framework, full-stack, soft skills).
 */
export function StudyProgramPath({
  nodes,
  statement,
  compact = false,
  rail = false,
  careerTrack = false,
}: {
  nodes?: NodeLite[];
  statement?: string | null;
  compact?: boolean;
  /** Faixa horizontal fina (mapa). */
  rail?: boolean;
  careerTrack?: boolean;
}) {
  const sorted = [...(nodes ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const stages: readonly StageLite[] = careerTrack ? DEV_CAREER_STAGES : STUDY_PROGRAM_STAGES;
  const className = [
    "study-path",
    compact ? "study-path--compact" : "",
    rail ? "study-path--rail" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={className}>
      <header className="study-path__head">
        <h2>{careerTrack ? "Programa de carreira" : "Programa de estudo"}</h2>
        {rail ? (
          <p className="muted">Metodologia em etapas — não mistura outros objectivos.</p>
        ) : (
          <p className="muted">
            {statement
              ? careerTrack
                ? `Linguagem + framework + full-stack + soft skills só para: «${statement}».`
                : `Sequência pedagógica só para: «${statement}». Não mistura outros objectivos.`
              : careerTrack
                ? "Carreira: fundamentos → framework → full-stack → soft skills → dia-a-dia → projecto."
                : "Sequência fixa: fundamentos → conceitos → materiais → prática → padrões → projecto → fecho."}
          </p>
        )}
      </header>
      <ol className="study-path__steps">
        {stages.map((stage, index) => {
          const node =
            sorted.find((n) => n.slug.includes(stage.key)) ?? sorted[index] ?? null;
          const done = node && ["studied", "passed"].includes(node.status ?? "");
          const failed = node?.status === "failed";
          return (
            <li
              key={stage.key}
              className={`study-path__step${done ? " is-done" : ""}${failed ? " is-failed" : ""}`}
            >
              <span className="study-path__n" aria-hidden="true">
                {index + 1}
              </span>
              <span className="study-path__meta">
                <strong>{stage.label.replace(/^\d+\.\s*/, "")}</strong>
                {!rail ? <span className="muted">{stage.role}</span> : null}
                {node && !rail ? (
                  <span className="muted">
                    {node.title}
                    {done ? " · evidência" : failed ? " · rever" : ""}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
