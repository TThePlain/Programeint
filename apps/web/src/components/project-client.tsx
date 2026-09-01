"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, api } from "@/lib/api";

type ProjectFile = { path: string; content: string };
type ProjectView = {
  project: {
    slug: string;
    title: string;
    brief: string;
    language: string;
    timeoutMs: number;
  };
  locked: boolean;
  missing: Array<{ slug: string; title: string }>;
  passed: boolean;
  passedAt: string | null;
  files: ProjectFile[];
  lastRun: {
    status: string;
    passed: boolean | null;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    errorCode: string | null;
  } | null;
};

export function ProjectClient({ slug }: { slug: string }) {
  const [view, setView] = useState<ProjectView | null>(null);
  const [draft, setDraft] = useState<ProjectFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"save" | "run" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setView(null);
    setDraft([]);
    setError(null);
    void (async () => {
      try {
        const data = await api<ProjectView>(`/api/projects/${slug}`);
        if (cancelled) return;
        setView(data);
        setDraft(data.files);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Não foi possível abrir o projeto.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function save() {
    setPending("save");
    setError(null);
    try {
      const data = await api<ProjectView>(`/api/projects/${slug}/files`, {
        method: "PUT",
        body: JSON.stringify({ files: draft }),
      });
      setView(data);
      setDraft(data.files);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível gravar.");
    } finally {
      setPending(null);
    }
  }

  async function run() {
    setPending("run");
    setError(null);
    try {
      await api(`/api/projects/${slug}/files`, {
        method: "PUT",
        body: JSON.stringify({ files: draft }),
      });
      const data = await api<ProjectView>(`/api/projects/${slug}/runs`, { method: "POST" });
      setView(data);
      setDraft(data.files);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível executar.");
    } finally {
      setPending(null);
    }
  }

  if (!view && !error) {
    return <p className="muted">A abrir o projeto…</p>;
  }

  if (error && !view) {
    return (
      <p className="alert alert-error" role="alert">
        {error}
      </p>
    );
  }

  if (!view) return null;

  const last = view.lastRun;

  return (
    <section className="stack">
      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}
      <p className="muted">Java 21 · execução Docker isolada · não é certificado</p>
      <p>{view.project.brief}</p>
      {view.locked ? (
        <p className="alert alert-error" role="status">
          Bloqueado. Falta evidência em: {view.missing.map((item) => item.title).join(", ")}.
        </p>
      ) : null}
      {view.passed ? (
        <p className="alert alert-ok" role="status">
          Evidência no portfólio (testes isolados). Não substitui um projeto de produção nem um
          diploma.
        </p>
      ) : null}
      {draft.map((file, index) => (
        <label key={file.path}>
          {file.path}
          <textarea
            className="code-editor"
            rows={16}
            spellCheck={false}
            value={file.content}
            onChange={(event) => {
              const next = [...draft];
              next[index] = { ...file, content: event.target.value };
              setDraft(next);
            }}
          />
        </label>
      ))}
      <p className="nav">
        <button
          className="btn btn-ghost"
          type="button"
          onClick={save}
          disabled={Boolean(pending) || view.locked}
        >
          {pending === "save" ? "A gravar…" : "Gravar"}
        </button>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => void run()}
          disabled={Boolean(pending) || view.locked}
        >
          {pending === "run" ? "A executar…" : "Correr testes do projeto"}
        </button>
      </p>
      {last ? (
        <div className="stack">
          {last.errorCode === "BLOCKED/CONFIGURATION_REQUIRED" ? (
            <p className="alert alert-error" role="status">
              {last.stderr}
            </p>
          ) : last.passed ? (
            <p className="alert alert-ok" role="status">
              Testes do projeto passaram na JVM isolada. A evidência está no portfólio.
            </p>
          ) : (
            <p className="alert alert-error" role="status">
              {last.status === "timeout"
                ? "Tempo esgotado no contentor."
                : "Os testes do projeto não passaram. O gabarito oculto não é enviado ao browser."}
            </p>
          )}
          {last.stdout ? <pre className="code-block">{last.stdout}</pre> : null}
          {last.stderr ? <pre className="code-block">{last.stderr}</pre> : null}
        </div>
      ) : null}
      <p className="nav">
        <Link className="btn btn-ghost" href="/portfolio">
          Portfólio
        </Link>
        {view.passed ? (
          <Link className="btn btn-primary" href="/app">
            O que fazer agora
          </Link>
        ) : null}
      </p>
    </section>
  );
}
