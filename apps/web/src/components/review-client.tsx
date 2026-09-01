"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, api } from "@/lib/api";
import type { NextActionView } from "@/lib/learning";

export function ReviewClient() {
  const [view, setView] = useState<NextActionView | null>(null);
  const [choiceId, setChoiceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function load() {
    setError(null);
    try {
      const data = await api<NextActionView>("/api/learning/next");
      setView(data);
      setChoiceId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível ler a revisão.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit() {
    if (!view?.question || !choiceId) return;
    setPending(true);
    setError(null);
    try {
      const data = await api<NextActionView>("/api/learning/reviews", {
        method: "POST",
        body: JSON.stringify({ questionId: view.question.id, choiceId }),
      });
      setView(data);
      setChoiceId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível gravar a revisão.");
    } finally {
      setPending(false);
    }
  }

  if (!view && !error) {
    return <p className="muted">A procurar revisões vencidas…</p>;
  }

  if (error && !view) {
    return (
      <p className="alert alert-error" role="alert">
        {error}
      </p>
    );
  }

  if (!view || view.kind !== "review_due" || !view.question) {
    return (
      <section className="stack">
        {view?.last ? (
          <p className={view.last.correct ? "alert alert-ok" : "alert alert-error"} role="status">
            {view.last.correct ? "Correto. " : "Incorreto. "}
            {view.last.explanation}
          </p>
        ) : null}
        <p className="muted">{view?.message ?? "Não há revisão vencida neste momento."}</p>
        <p>
          <Link className="btn btn-primary" href={view?.href ?? "/app"}>
            {view?.label ?? "Voltar a estudar"}
          </Link>
        </p>
      </section>
    );
  }

  const question = view.question;
  return (
    <section className="stack">
      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}
      {view.last ? (
        <p className={view.last.correct ? "alert alert-ok" : "alert alert-error"} role="status">
          {view.last.correct ? "Correto. " : "Incorreto. "}
          {view.last.explanation}
        </p>
      ) : null}
      <p className="muted">Revisão FSRS · {question.nodeTitle}</p>
      <h2>{question.prompt}</h2>
      {question.code ? <pre className="code-block">{question.code}</pre> : null}
      <fieldset>
        <legend>Escolhe uma opção</legend>
        {question.choices.map((choice) => (
          <label key={choice.id} className="choice">
            <input
              type="radio"
              name="review"
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
    </section>
  );
}
