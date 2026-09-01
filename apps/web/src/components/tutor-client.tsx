"use client";

import { FormEvent, useState } from "react";
import { TUTOR_HELP_LABELS, type TutorHelpLevel } from "@programeint/shared";
import { ApiError, api } from "@/lib/api";
import type { TutorThread } from "@/lib/tutor";

export function TutorClient({ thread }: { thread: TutorThread }) {
  const [view, setView] = useState(thread);
  const [draft, setDraft] = useState("");
  const [helpLevel, setHelpLevel] = useState<TutorHelpLevel>(2);
  const [includeLabCode, setIncludeLabCode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (content.length < 2) return;
    setPending(true);
    setError(null);
    try {
      const data = await api<TutorThread>(`/api/tutor/threads/${view.node.slug}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, helpLevel, includeLabCode }),
      });
      setView(data);
      setDraft("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível falar com o tutor.");
    } finally {
      setPending(false);
    }
  }

  if (!view.configured) {
    return (
      <section className="stack">
        <p className="alert alert-error" role="status">
          <strong>{view.errorCode}</strong> — {view.message}
        </p>
        <p className="muted">
          Define <code>AI_API_KEY</code> (e opcionalmente <code>AI_BASE_URL</code> e{" "}
          <code>AI_MODEL</code>) no ambiente da API e reinicia-a. Enquanto não houver chave, não há
          caixa de perguntas: nada aqui é simulado.
        </p>
      </section>
    );
  }

  return (
    <section className="stack">
      <p className="muted">{view.message}</p>
      {view.messages.length === 0 ? (
        <p className="muted">Ainda não perguntaste nada sobre {view.node.title}.</p>
      ) : (
        <ol className="stack tutor-thread">
          {view.messages.map((message) => (
            <li key={message.id} className={`tutor-turn tutor-${message.role}`}>
              <strong>
                {message.role === "user" ? "Tu" : "Tutor"}
                {message.helpLevel != null ? ` · nível ${message.helpLevel}` : ""}
              </strong>
              <p>{message.content}</p>
            </li>
          ))}
        </ol>
      )}
      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}
      <form className="stack" onSubmit={ask}>
        <label>
          Nível de ajuda
          <select
            value={helpLevel}
            onChange={(event) => setHelpLevel(Number(event.target.value) as TutorHelpLevel)}
          >
            {([0, 1, 2, 3, 4, 5, 6] as TutorHelpLevel[]).map((level) => (
              <option key={level} value={level}>
                {level} — {TUTOR_HELP_LABELS[level]}
              </option>
            ))}
          </select>
        </label>
        {view.hasLab ? (
          <label className="choice">
            <input
              type="checkbox"
              checked={includeLabCode}
              onChange={(event) => setIncludeLabCode(event.target.checked)}
            />
            Incluir o meu código actual do lab no contexto
          </label>
        ) : null}
        <label>
          Pergunta sobre {view.node.title}
          <textarea
            name="content"
            rows={4}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Onde é que o meu raciocínio falha?"
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={pending || draft.trim().length < 2}>
          {pending ? "A perguntar…" : "Perguntar ao tutor"}
        </button>
      </form>
    </section>
  );
}
