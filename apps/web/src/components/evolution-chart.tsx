"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, api } from "@/lib/api";

type EvolutionView = {
  weeks: Array<{
    weekStart: string;
    label: string;
    completed: number;
    correct: number;
  }>;
  goal?: {
    id: string;
    statement: string;
    primaryLabel: string | null;
  } | null;
  summary: {
    modulesCompleted: number;
    nodesWithEvidence: number;
    totalNodes: number;
    progressPct: number;
  };
};

type Props = {
  /** Versão compacta para o topo do /app */
  hero?: boolean;
};

export function EvolutionChart({ hero = false }: Props) {
  const [view, setView] = useState<EvolutionView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await api<EvolutionView>("/api/learning/evolution");
        if (!cancelled) setView(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Não foi possível ler a evolução.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const max = useMemo(() => {
    if (!view?.weeks.length) return 1;
    return Math.max(1, ...view.weeks.map((w) => w.completed));
  }, [view]);

  if (error) {
    return (
      <p className="alert alert-error" role="status">
        {error}
      </p>
    );
  }

  if (!view) {
    return <p className="muted">A carregar evolução…</p>;
  }

  const pct = view.summary.progressPct;

  if (hero) {
    return (
      <article className="card wide progress-hero">
        <div
          className="progress-hero__ring"
          style={{ ["--pct" as string]: pct }}
          role="img"
          aria-label={`Progresso ${pct} por cento neste objectivo`}
        >
          <div className="progress-hero__ring-inner">{pct}%</div>
        </div>
        <div className="stack" style={{ gap: "0.4rem" }}>
          <h2 style={{ margin: 0 }}>Progresso neste objectivo</h2>
          <p className="muted" style={{ margin: 0 }}>
            {view.goal ? `«${view.goal.statement}» · ` : ""}
            {view.summary.nodesWithEvidence}/{view.summary.totalNodes} nós com evidência
          </p>
          <div className="study-progress__bar" aria-hidden="true">
            <div className="study-progress__fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </article>
    );
  }

  const width = 560;
  const height = 180;
  const pad = { t: 16, r: 12, b: 36, l: 28 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const gap = 10;
  const barW = (innerW - gap * (view.weeks.length - 1)) / view.weeks.length;

  return (
    <article className="evolution card wide stack">
      <header className="evolution__head">
        <h2>Evolução de estudo</h2>
        <p className="muted">
          {view.goal ? `Só neste objectivo: «${view.goal.statement}». ` : ""}
          Módulos verificados nas últimas {view.weeks.length} semanas — sem misturar outros
          objectivos.
        </p>
      </header>

      <dl className="evolution__stats">
        <div>
          <dt>Progresso no mapa</dt>
          <dd>{view.summary.progressPct}%</dd>
        </div>
        <div>
          <dt>Nós com evidência</dt>
          <dd>
            {view.summary.nodesWithEvidence}/{view.summary.totalNodes}
          </dd>
        </div>
        <div>
          <dt>Módulos (8 sem.)</dt>
          <dd>{view.summary.modulesCompleted}</dd>
        </div>
      </dl>

      <svg
        className="evolution__chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Gráfico de módulos verificados por semana"
      >
        {view.weeks.map((week, index) => {
          const h = (week.completed / max) * innerH;
          const x = pad.l + index * (barW + gap);
          const y = pad.t + innerH - h;
          const correctH = max ? (week.correct / max) * innerH : 0;
          return (
            <g key={week.weekStart}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, week.completed > 0 ? 4 : 0)}
                rx={6}
                className="evolution__bar"
              />
              {week.correct > 0 ? (
                <rect
                  x={x}
                  y={pad.t + innerH - correctH}
                  width={barW}
                  height={Math.max(correctH, 4)}
                  rx={6}
                  className="evolution__bar evolution__bar--ok"
                />
              ) : null}
              <text x={x + barW / 2} y={height - 12} textAnchor="middle" className="evolution__label">
                {week.label}
              </text>
              {week.completed > 0 ? (
                <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="evolution__value">
                  {week.completed}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </article>
  );
}
