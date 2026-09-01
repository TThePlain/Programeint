"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, api } from "@/lib/api";

type Ritual = {
  kind: "standup" | "ticket" | "pr";
  title: string;
  durationHint: string;
  purpose: string;
  scenario: string;
  tips: string[];
  status: "pending" | "passed" | "failed";
};

type WorkSimView = {
  available: boolean;
  message?: string;
  note?: string;
  completedCount?: number;
  totalCount?: number;
  goal?: {
    id: string;
    statement: string;
    primaryTarget: { slug: string; label: string } | null;
  };
  career?: { roleTitle: string; careerType: string } | null;
  rituals?: Ritual[];
  passed?: boolean;
  feedback?: string[];
};

export function WorkSimClient() {
  const [view, setView] = useState<WorkSimView | null>(null);
  const [active, setActive] = useState<Ritual["kind"]>("standup");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string[] | null>(null);
  const [lastPassed, setLastPassed] = useState<boolean | null>(null);

  // standup
  const [yesterday, setYesterday] = useState("");
  const [today, setToday] = useState("");
  const [blocker, setBlocker] = useState("nenhum");
  // ticket
  const [questions, setQuestions] = useState("");
  const [criteria, setCriteria] = useState("");
  const [estimate, setEstimate] = useState("");
  // pr
  const [summary, setSummary] = useState("");
  const [howToTest, setHowToTest] = useState("");
  const [review, setReview] = useState("");

  async function load() {
    try {
      const data = await api<WorkSimView>("/api/work-sim");
      setView(data);
      const next = data.rituals?.find((r) => r.status !== "passed");
      if (next) setActive(next.kind);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível abrir o simulador.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFeedback(null);
    setLastPassed(null);
    try {
      const body =
        active === "standup"
          ? { kind: "standup", yesterday, today, blocker }
          : active === "ticket"
            ? {
                kind: "ticket",
                clarifyingQuestions: questions,
                acceptanceCriteria: criteria,
                estimateNote: estimate,
              }
            : {
                kind: "pr",
                summary,
                howToTest,
                reviewComment: review,
              };
      const data = await api<WorkSimView & { passed?: boolean }>("/api/work-sim/submit", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setView(data);
      setFeedback(data.feedback ?? null);
      setLastPassed(Boolean(data.passed));
      if (data.passed) {
        const next = data.rituals?.find((r) => r.status !== "passed");
        if (next) setActive(next.kind);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível submeter.");
    } finally {
      setPending(false);
    }
  }

  if (!view && !error) {
    return <p className="muted">A carregar o simulador de trabalho…</p>;
  }

  if (error && !view) {
    return (
      <p className="alert alert-error" role="alert">
        {error}
      </p>
    );
  }

  if (!view?.available) {
    return (
      <div className="stack">
        <p className="alert" role="status">
          {view?.message ?? "Simulador indisponível."}
        </p>
        <Link className="btn btn-ghost" href="/mapa">
          Ir ao mapa
        </Link>
      </div>
    );
  }

  const ritual = view.rituals?.find((r) => r.kind === active) ?? view.rituals?.[0];
  const allDone = (view.completedCount ?? 0) >= (view.totalCount ?? 3);

  return (
    <section className="stack work-sim">
      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="now">
        <strong>Objectivo:</strong> {view.goal?.statement}
        {view.career ? ` · ${view.career.roleTitle}` : ""}
      </div>
      <p className="muted">{view.note}</p>
      <p className="muted">
        Progresso: {view.completedCount ?? 0}/{view.totalCount ?? 3} rituais com evidência
      </p>

      <ol className="work-sim__steps">
        {(view.rituals ?? []).map((r) => (
          <li key={r.kind}>
            <button
              type="button"
              className={`work-sim__tab${active === r.kind ? " is-active" : ""}${
                r.status === "passed" ? " is-done" : ""
              }`}
              onClick={() => {
                setActive(r.kind);
                setFeedback(null);
                setLastPassed(null);
              }}
            >
              {r.title}
              {r.status === "passed" ? " · ok" : r.status === "failed" ? " · rever" : ""}
            </button>
          </li>
        ))}
      </ol>

      {allDone ? (
        <p className="alert alert-ok" role="status">
          Completaste os 3 rituais deste objectivo. Isto é evidência de soft skills — não um
          certificado.
        </p>
      ) : null}

      {ritual ? (
        <form className="stack work-sim__form" onSubmit={(e) => void onSubmit(e)}>
          <header className="stack" style={{ gap: "0.35rem" }}>
            <h2 style={{ margin: 0 }}>{ritual.title}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {ritual.durationHint} · {ritual.purpose}
            </p>
          </header>

          <div className="work-sim__scenario">
            <strong>Cenário</strong>
            <pre>{ritual.scenario}</pre>
          </div>

          <ul className="muted">
            {ritual.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>

          {active === "standup" ? (
            <>
              <label>
                Ontem
                <textarea
                  rows={2}
                  value={yesterday}
                  onChange={(e) => setYesterday(e.target.value)}
                  required
                  placeholder="Ex.: Fechei o endpoint de login e corrigi o teste que falhava."
                />
              </label>
              <label>
                Hoje
                <textarea
                  rows={2}
                  value={today}
                  onChange={(e) => setToday(e.target.value)}
                  required
                  placeholder="Ex.: Abro o PR da validação e peço review ao colega."
                />
              </label>
              <label>
                Bloqueio
                <textarea
                  rows={2}
                  value={blocker}
                  onChange={(e) => setBlocker(e.target.value)}
                  required
                  placeholder="nenhum — ou descreve o bloqueio"
                />
              </label>
            </>
          ) : null}

          {active === "ticket" ? (
            <>
              <label>
                Perguntas de clarificação (mín. 2 com «?»)
                <textarea
                  rows={4}
                  value={questions}
                  onChange={(e) => setQuestions(e.target.value)}
                  required
                  placeholder={"1. Quem é o utilizador?\n2. Quando está «feito»?"}
                />
              </label>
              <label>
                Critérios de aceitação (pass/fail)
                <textarea
                  rows={4}
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  required
                />
              </label>
              <label>
                Estimativa / incerteza
                <textarea
                  rows={2}
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  required
                />
              </label>
            </>
          ) : null}

          {active === "pr" ? (
            <>
              <label>
                Resumo do PR (como autor)
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  required
                />
              </label>
              <label>
                Como testar
                <textarea
                  rows={3}
                  value={howToTest}
                  onChange={(e) => setHowToTest(e.target.value)}
                  required
                  placeholder="Passos: curl / browser / cenário…"
                />
              </label>
              <label>
                Comentário de review (como revisor)
                <textarea
                  rows={4}
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  required
                  placeholder="Aponta um problema e sugere alternativa — não só LGTM."
                />
              </label>
            </>
          ) : null}

          {feedback ? (
            <ul className={lastPassed === false ? "alert alert-error" : "alert alert-ok"}>
              {feedback.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}

          <p className="nav">
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? "A validar…" : "Submeter evidência deste ritual"}
            </button>
            <Link className="btn btn-ghost" href="/mapa">
              Voltar ao mapa
            </Link>
          </p>
        </form>
      ) : null}
    </section>
  );
}
