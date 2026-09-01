"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ApiError, api } from "@/lib/api";

type LabFile = { path: string; content: string };
type LabView = {
  exercise: {
    slug: string;
    title: string;
    prompt: string;
    language: string;
    timeoutMs: number;
    node: { slug: string; title: string };
  };
  files: LabFile[];
  lastRun: {
    status: string;
    passed: boolean | null;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    errorCode: string | null;
  } | null;
};

export function LabClient({ slug }: { slug: string }) {
  const [view, setView] = useState<LabView | null>(null);
  const [draft, setDraft] = useState<LabFile[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"save" | "run" | null>(null);
  const [briefOpen, setBriefOpen] = useState(true);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [dirty, setDirty] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    setView(null);
    setDraft([]);
    setActivePath(null);
    setError(null);
    setDirty(false);
    void (async () => {
      try {
        const data = await api<LabView>(`/api/lab/exercises/${slug}`);
        if (cancelled) return;
        setView(data);
        setDraft(data.files);
        setActivePath(data.files[0]?.path ?? null);
        setConsoleOpen(Boolean(data.lastRun));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Não foi possível abrir o lab.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const activeFile = useMemo(
    () => draft.find((f) => f.path === activePath) ?? draft[0] ?? null,
    [draft, activePath],
  );

  const lineCount = useMemo(() => {
    if (!activeFile) return 0;
    return activeFile.content.split("\n").length;
  }, [activeFile]);

  const charCount = activeFile?.content.length ?? 0;

  async function save() {
    setPending("save");
    setError(null);
    try {
      const data = await api<LabView>(`/api/lab/exercises/${slug}/files`, {
        method: "PUT",
        body: JSON.stringify({ files: draft }),
      });
      setView(data);
      setDraft(data.files);
      setDirty(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível gravar.");
    } finally {
      setPending(null);
    }
  }

  async function run() {
    setPending("run");
    setError(null);
    setConsoleOpen(true);
    try {
      await api(`/api/lab/exercises/${slug}/files`, {
        method: "PUT",
        body: JSON.stringify({ files: draft }),
      });
      const data = await api<LabView>(`/api/lab/exercises/${slug}/runs`, { method: "POST" });
      setView(data);
      setDraft(data.files);
      setDirty(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível executar.");
    } finally {
      setPending(null);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      if (event.key === "s") {
        event.preventDefault();
        if (!pending) void save();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (!pending) void run();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, pending, slug]);

  function updateActiveContent(content: string) {
    if (!activeFile) return;
    setDirty(true);
    setDraft((prev) =>
      prev.map((file) => (file.path === activeFile.path ? { ...file, content } : file)),
    );
  }

  if (!view && !error) {
    return (
      <div className="ide ide--loading">
        <p className="muted">A abrir o ambiente de prática…</p>
      </div>
    );
  }

  if (error && !view) {
    return (
      <div className="ide ide--loading">
        <p className="alert alert-error" role="alert">
          {error}
        </p>
        <p className="nav">
          <Link className="btn btn-ghost" href="/pratica">
            Voltar à prática
          </Link>
        </p>
      </div>
    );
  }

  if (!view || !activeFile) return null;

  const last = view.lastRun;
  const guided = view.exercise.language === "guided";
  const runLabel = guided ? "Validar" : "Run";
  const runningLabel = guided ? "A validar…" : "A executar…";

  return (
    <div className={`ide${guided ? " ide--guided" : ""}`}>
      <header className="ide__toolbar">
        <div className="ide__toolbar-left">
          <Link className="ide__back" href="/pratica">
            ← Prática
          </Link>
          <span className="ide__sep" aria-hidden="true" />
          <div className="ide__title-block">
            <strong className="ide__title">{view.exercise.title}</strong>
            <span className="ide__subtitle">{view.exercise.node.title}</span>
          </div>
          {dirty ? <span className="ide__dirty">por gravar</span> : null}
        </div>
        <div className="ide__toolbar-actions">
          <button
            type="button"
            className="ide__btn"
            onClick={() => setBriefOpen((v) => !v)}
            aria-pressed={briefOpen}
          >
            {briefOpen ? "Ocultar enunciado" : "Enunciado"}
          </button>
          <button
            type="button"
            className="ide__btn"
            onClick={() => void save()}
            disabled={Boolean(pending) || !dirty}
            title="⌘/Ctrl + S"
          >
            {pending === "save" ? "A gravar…" : "Gravar"}
          </button>
          <button
            type="button"
            className="ide__btn ide__btn--run"
            onClick={() => void run()}
            disabled={Boolean(pending)}
            title="⌘/Ctrl + Enter"
          >
            {pending === "run" ? runningLabel : `▶ ${runLabel}`}
          </button>
        </div>
      </header>

      {error ? (
        <p className="ide__banner ide__banner--error" role="alert">
          {error}
        </p>
      ) : null}

      <div className={`ide__body${briefOpen ? "" : " ide__body--wide"}`}>
        {briefOpen ? (
          <aside className="ide__brief">
            <p className="ide__brief-label">{guided ? "Problema" : "Lab"}</p>
            <h2 className="ide__brief-title">{view.exercise.title}</h2>
            <p className="ide__brief-prompt">{view.exercise.prompt}</p>
            <ul className="ide__brief-tips">
              {guided ? (
                <>
                  <li>Preenche pelo menos 2 pontos com conteúdo real.</li>
                  <li>Não deixes só «- Enunciado:» vazio.</li>
                  <li>⌘/Ctrl+Enter valida a solução.</li>
                </>
              ) : (
                <>
                  <li>Edita o código e corre os testes isolados.</li>
                  <li>⌘/Ctrl+S grava · ⌘/Ctrl+Enter executa.</li>
                </>
              )}
            </ul>
            {last?.passed ? (
              <p className="ide__brief-ok">
                Aceite.{" "}
                <Link href="/mapa">Seguir no mapa →</Link>
              </p>
            ) : null}
          </aside>
        ) : null}

        <div className="ide__workspace">
          <div className="ide__tabs" role="tablist" aria-label="Ficheiros">
            {draft.map((file) => {
              const active = file.path === activeFile.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`ide__tab${active ? " is-active" : ""}`}
                  onClick={() => setActivePath(file.path)}
                >
                  {file.path}
                  {dirty && active ? " ·" : ""}
                </button>
              );
            })}
          </div>

          <div className="ide__editor-wrap">
            <div className="ide__gutter" aria-hidden="true">
              {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <textarea
              ref={editorRef}
              className="ide__editor"
              spellCheck={guided}
              value={activeFile.content}
              onChange={(event) => updateActiveContent(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Tab") return;
                event.preventDefault();
                const el = event.currentTarget;
                const start = el.selectionStart;
                const end = el.selectionEnd;
                const next = `${activeFile.content.slice(0, start)}  ${activeFile.content.slice(end)}`;
                updateActiveContent(next);
                requestAnimationFrame(() => {
                  el.selectionStart = el.selectionEnd = start + 2;
                });
              }}
              onScroll={(event) => {
                const gutter = event.currentTarget.previousElementSibling as HTMLElement | null;
                if (gutter) gutter.scrollTop = event.currentTarget.scrollTop;
              }}
              aria-label={`Editor ${activeFile.path}`}
            />
          </div>

          <div className="ide__statusbar">
            <span>{activeFile.path}</span>
            <span>
              Ln {lineCount} · {charCount} chars
              {guided ? " · markdown" : " · java"}
            </span>
          </div>

          <section className={`ide__console${consoleOpen ? " is-open" : ""}`}>
            <button
              type="button"
              className="ide__console-toggle"
              onClick={() => setConsoleOpen((v) => !v)}
              aria-expanded={consoleOpen}
            >
              <span>Consola</span>
              <span className="ide__console-meta">
                {last
                  ? last.passed
                    ? "PASS"
                    : last.errorCode === "BLOCKED/CONFIGURATION_REQUIRED"
                      ? "BLOCKED"
                      : "FAIL"
                  : "sem output"}
              </span>
            </button>
            {consoleOpen ? (
              <div className="ide__console-body" role="status">
                {!last ? (
                  <p className="ide__console-empty">
                    Corre {guided ? "Validar" : "Run"} para ver o resultado aqui.
                  </p>
                ) : last.errorCode === "BLOCKED/CONFIGURATION_REQUIRED" ? (
                  <pre className="ide__console-out ide__console-out--err">{last.stderr}</pre>
                ) : (
                  <>
                    <p
                      className={
                        last.passed ? "ide__console-status is-ok" : "ide__console-status is-fail"
                      }
                    >
                      {last.passed
                        ? guided
                          ? "Solução aceite — conta para o progresso deste objectivo."
                          : "Testes passaram na JVM isolada."
                        : guided
                          ? last.stdout ||
                            "Ainda incompleto — preenche sem placeholders e com lista concreta."
                          : last.status === "timeout"
                            ? "Tempo esgotado no contentor."
                            : "Os testes não passaram."}
                    </p>
                    {last.stdout ? (
                      <pre className="ide__console-out">{last.stdout}</pre>
                    ) : null}
                    {!guided && last.stderr ? (
                      <pre className="ide__console-out ide__console-out--err">{last.stderr}</pre>
                    ) : null}
                    {last.passed ? (
                      <p className="ide__console-actions">
                        <Link className="btn btn-primary" href="/mapa">
                          Seguir no mapa
                        </Link>
                        <Link className="btn btn-ghost" href="/pratica">
                          Outras práticas
                        </Link>
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
