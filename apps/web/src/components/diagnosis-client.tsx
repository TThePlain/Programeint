"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, api } from "@/lib/api";

type Choice = { id: string; text: string };
type DiagnosisView = {
  available: boolean;
  message?: string;
  sessionId?: string;
  status?: string;
  askedCount?: number;
  maxQuestions?: number;
  question?: {
    id: string;
    nodeTitle: string;
    prompt: string;
    code: string | null;
    choices: Choice[];
  } | null;
  last?: { correct: boolean; explanation: string };
  recommendedStart?: { slug: string; title: string } | null;
  goal?: {
    id: string;
    statement: string;
    primaryLabel: string | null;
    targetTitle: string;
  };
};

export function DiagnosisClient() {
  const [view, setView] = useState<DiagnosisView | null>(null);
  const [choiceId, setChoiceId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function start() {
    setError(null);
    try {
      const data = await api<DiagnosisView>("/api/diagnosis/sessions", { method: "POST" });
      setView(data);
      setChoiceId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível iniciar o diagnóstico.");
    }
  }

  useEffect(() => {
    void start();
  }, []);

  async function submit() {
    if (!view?.sessionId || !view.question || !choiceId) return;
    setPending(true);
    setError(null);
    try {
      const data = await api<DiagnosisView>(`/api/diagnosis/sessions/${view.sessionId}/answers`, {
        method: "POST",
        body: JSON.stringify({ questionId: view.question.id, choiceId }),
      });
      setView(data);
      setChoiceId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível gravar a resposta.");
    } finally {
      setPending(false);
    }
  }

  if (!view && !error) {
    return <p className="muted">A preparar o diagnóstico…</p>;
  }

  if (view && view.available === false) {
    return (
      <section className="stack">
        {view.goal ? (
          <p className="muted">
            Objectivo: {view.goal.primaryLabel ?? view.goal.targetTitle}
            {view.goal.statement ? ` — ${view.goal.statement}` : ""}
          </p>
        ) : null}
        <p className="alert alert-error" role="status">
          {view.message ?? "Diagnóstico indisponível para este objectivo."}
        </p>
        <p className="nav">
          <Link className="btn btn-ghost" href="/mapa">
            Ver mapa
          </Link>
        </p>
      </section>
    );
  }

  if (view?.status === "completed") {
    return (
      <section className="stack">
        {view.goal ? (
          <p className="muted">
            Diagnóstico de: {view.goal.primaryLabel ?? view.goal.targetTitle}
          </p>
        ) : null}
        {view.last ? (
          <p className={view.last.correct ? "alert alert-ok" : "alert alert-error"} role="status">
            {view.last.correct ? "Resposta correta. " : "Resposta incorreta. "}
            {view.last.explanation}
          </p>
        ) : null}
        <p className="alert alert-ok" role="status">
          Diagnóstico concluído. Isto é evidência pontual, não domínio.
        </p>
        {view.recommendedStart ? (
          <div className="now">
            <strong>O que fazer agora:</strong> o mapa e o estudo usam este resultado. Começar por{" "}
            {view.recommendedStart.title}.
          </div>
        ) : null}
        <p className="nav">
          <Link className="btn btn-primary" href="/app">
            O que fazer agora
          </Link>
          <Link className="btn btn-ghost" href="/mapa">
            Ver mapa
          </Link>
        </p>
      </section>
    );
  }

  const question = view?.question;
  return (
    <section className="stack">
      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}
      {view?.last ? (
        <p className={view.last.correct ? "alert alert-ok" : "alert alert-error"} role="status">
          {view.last.correct ? "Correto. " : "Incorreto. "}
          {view.last.explanation}
        </p>
      ) : null}
      {view?.goal ? (
        <p className="muted">
          Sobre: {view.goal.primaryLabel ?? view.goal.targetTitle}
          {view.goal.statement ? ` — ${view.goal.statement}` : ""}
        </p>
      ) : null}
      <p className="muted">
        Questão {(view?.askedCount ?? 0) + 1} de {view?.maxQuestions} · {question?.nodeTitle}
      </p>
      {question ? (
        <>
          <h2>{question.prompt}</h2>
          {question.code ? <pre className="code-block">{question.code}</pre> : null}
          <fieldset>
            <legend>Escolhe uma opção</legend>
            {question.choices.map((choice) => (
              <label key={choice.id} className="choice">
                <input
                  type="radio"
                  name="choice"
                  value={choice.id}
                  checked={choiceId === choice.id}
                  onChange={() => setChoiceId(choice.id)}
                />
                {choice.text}
              </label>
            ))}
          </fieldset>
          <button className="btn btn-primary" type="button" onClick={submit} disabled={pending || !choiceId}>
            {pending ? "A gravar…" : "Responder"}
          </button>
        </>
      ) : (
        <p className="muted">A avançar…</p>
      )}
    </section>
  );
}
