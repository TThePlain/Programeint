"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api";

type RunResult = {
  status: string;
  passed: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  errorCode: string | null;
};

type Props = {
  postId: string;
  title: string;
  brief: string;
  acceptanceCriteria: string | null;
  starterCode: string;
  hasChecks: boolean;
  onPublished?: () => void;
};

export function ForumChallengeIde({
  postId,
  title,
  brief,
  acceptanceCriteria,
  starterCode,
  hasChecks,
  onPublished,
}: Props) {
  const [code, setCode] = useState(starterCode);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"run" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<RunResult | null>(null);
  const [briefOpen, setBriefOpen] = useState(true);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCode(starterCode);
    setRun(null);
  }, [starterCode, postId]);

  const lineCount = useMemo(() => code.split("\n").length, [code]);

  async function runCode() {
    setPending("run");
    setError(null);
    try {
      const data = await api<{ run: RunResult }>(
        `/api/forum/posts/${encodeURIComponent(postId)}/run`,
        { method: "POST", body: JSON.stringify({ code }) },
      );
      setRun(data.run);
    } catch (err) {
      setError(err instanceof ApiError ? (err.body.message ?? err.message) : "Falha ao executar.");
    } finally {
      setPending(null);
    }
  }

  async function publish() {
    setPending("publish");
    setError(null);
    try {
      const data = await api<{ run: RunResult }>(
        `/api/forum/posts/${encodeURIComponent(postId)}/solutions`,
        {
          method: "POST",
          body: JSON.stringify({ code, note: note || undefined }),
        },
      );
      setRun(data.run);
      onPublished?.();
    } catch (err) {
      setError(err instanceof ApiError ? (err.body.message ?? err.message) : "Falha ao publicar.");
    } finally {
      setPending(null);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      if (event.key === "Enter") {
        event.preventDefault();
        if (!pending) void runCode();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, pending, postId]);

  const badge =
    run == null
      ? null
      : run.errorCode?.includes("BLOCKED")
        ? "BLOCKED"
        : run.passed
          ? "PASS"
          : "FAIL";

  return (
    <div className="forum-ide">
      <header className="forum-ide__toolbar">
        <div className="forum-ide__toolbar-left">
          <strong className="forum-ide__title">{title}</strong>
          <span className="muted forum-ide__meta">
            Java · sandbox · {hasChecks ? "testes ocultos" : "execução livre"}
          </span>
        </div>
        <div className="forum-ide__actions">
          <button
            type="button"
            className="ide__btn"
            onClick={() => setBriefOpen((v) => !v)}
            aria-pressed={briefOpen}
          >
            {briefOpen ? "Ocultar brief" : "Brief"}
          </button>
          <button
            type="button"
            className="ide__btn ide__btn--run"
            onClick={() => void runCode()}
            disabled={Boolean(pending)}
            title="⌘/Ctrl + Enter"
          >
            {pending === "run" ? "A executar…" : "▶ Run"}
          </button>
          <button
            type="button"
            className="ide__btn"
            onClick={() => void publish()}
            disabled={Boolean(pending)}
          >
            {pending === "publish" ? "A publicar…" : "Publicar solução"}
          </button>
        </div>
      </header>

      {error ? (
        <p className="ide__banner ide__banner--error" role="alert">
          {error}
        </p>
      ) : null}

      <div className={`forum-ide__body${briefOpen ? "" : " forum-ide__body--wide"}`}>
        {briefOpen ? (
          <aside className="forum-ide__brief">
            <p className="ide__brief-label">Ticket / problema</p>
            <h3 className="ide__brief-title">{title}</h3>
            <p className="ide__brief-prompt">{brief}</p>
            {acceptanceCriteria ? (
              <>
                <p className="ide__brief-label">Critérios de aceitação</p>
                <p className="ide__brief-prompt">{acceptanceCriteria}</p>
              </>
            ) : null}
            <ul className="ide__brief-tips">
              <li>Trata isto como um ticket real: lê o brief, implementa, corre os testes.</li>
              <li>Os testes (Check) ficam ocultos — o teu código tem de cumprir o contrato.</li>
              <li>⌘/Ctrl+Enter executa no sandbox isolado.</li>
              <li>Sem limite artificial de tamanho — trabalha o código necessário.</li>
            </ul>
            {run?.passed ? (
              <p className="ide__brief-ok">PASS — critérios cumpridos. Podes publicar a solução.</p>
            ) : null}
          </aside>
        ) : null}

        <div className="forum-ide__workspace">
          <div className="ide__tabs" role="tablist">
            <span className="ide__tab is-active">Solution.java</span>
          </div>
          <div className="ide__editor-wrap">
            <textarea
              ref={editorRef}
              className="ide__editor"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-label="Código da solução"
            />
          </div>
          <div className="ide__statusbar">
            <span>{lineCount} linhas</span>
            <span>{code.length.toLocaleString("pt-BR")} chars</span>
          </div>

          <label className="field forum-ide__note">
            <span>Nota da solução (opcional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Como abordaste o problema, trade-offs, edge cases…"
            />
          </label>

          <div className={`ide__console${run ? " is-open" : ""}`}>
            <div className="ide__console-bar">
              <span>Consola</span>
              {badge ? (
                <span
                  className={`ide__console-badge${
                    badge === "PASS" ? " is-ok" : badge === "BLOCKED" ? " is-blocked" : " is-fail"
                  }`}
                >
                  {badge}
                </span>
              ) : null}
            </div>
            {run ? (
              <div className="ide__console-body">
                <p
                  className={`ide__console-status${run.passed ? " is-ok" : " is-fail"}`}
                  role="status"
                >
                  {run.passed
                    ? "Sucesso — os testes passaram."
                    : run.errorCode?.includes("BLOCKED")
                      ? "Sandbox indisponível (Docker). A solução pode ser publicada na mesma."
                      : "Falhou — revê a lógica e volta a correr."}
                  {run.exitCode != null ? ` · exit ${run.exitCode}` : ""}
                </p>
                {run.stdout ? (
                  <pre className="ide__console-out" tabIndex={0}>
                    {run.stdout}
                  </pre>
                ) : null}
                {run.stderr ? (
                  <pre className="ide__console-out ide__console-out--err" tabIndex={0}>
                    {run.stderr}
                  </pre>
                ) : null}
              </div>
            ) : (
              <p className="muted ide__console-empty">Corre o código para ver PASS / FAIL.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
