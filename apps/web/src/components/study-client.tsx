"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, api } from "@/lib/api";
import { LessonContent } from "@/components/lesson-content";
import { StudyMaterialTabs } from "@/components/study-material-tabs";
import { StudyVideos } from "@/components/study-videos";

type Choice = { id: string; text: string };
type StudyView = {
  sessionId: string;
  status: string;
  read: boolean;
  checkCorrect: boolean | null;
  warning: string | null;
  goal?: { statement: string; primaryLabel: string | null } | null;
  progress?: {
    studied: number;
    total: number;
    progressPct: number;
    currentTitle: string;
  };
  resources?: Array<{
    slug: string;
    title: string;
    url: string;
    publisher: string;
    kind: string;
    summary: string;
  }>;
  labSlug?: string | null;
  node: { slug: string; title: string };
  module: { slug: string; title: string; summary: string; body: string };
  question: {
    id: string;
    nodeTitle: string;
    prompt: string;
    code: string | null;
    choices: Choice[];
  } | null;
  last?: { correct: boolean; explanation: string };
};

function StudyProgressHeader({ view }: { view: StudyView }) {
  if (!view.goal && !view.progress) return null;
  const pct = view.progress?.progressPct ?? 0;
  return (
    <div className="lesson-shell__progress">
      {view.goal ? (
        <p className="lesson-shell__goal">
          <strong>{view.goal.statement}</strong>
          {view.goal.primaryLabel ? ` · ${view.goal.primaryLabel}` : ""}
        </p>
      ) : null}
      {view.progress ? (
        <>
          <p className="lesson-shell__meta">
            {pct}% neste objectivo · {view.progress.studied}/{view.progress.total} nós
          </p>
          <div
            className="study-progress__bar"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progresso ${pct} por cento`}
          >
            <div className="study-progress__fill" style={{ width: `${pct}%` }} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function LessonHeader({ title, summary }: { title: string; summary?: string }) {
  return (
    <header>
      <h1 className="lesson-shell__title">{title}</h1>
      {summary ? <p className="lesson-shell__summary">{summary}</p> : null}
    </header>
  );
}

export function StudyClient({
  nodeSlug,
  initialPreview,
}: {
  nodeSlug: string;
  initialPreview?: {
    title: string;
    summary: string;
    body: string;
    goalStatement?: string | null;
    primaryLabel?: string | null;
    resources?: StudyView["resources"];
  } | null;
}) {
  const [view, setView] = useState<StudyView | null>(null);
  const [choiceId, setChoiceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function start() {
    setError(null);
    try {
      const data = await api<StudyView>("/api/learning/sessions", {
        method: "POST",
        body: JSON.stringify({ nodeSlug }),
      });
      setView(data);
      setChoiceId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível abrir o módulo.");
    }
  }

  useEffect(() => {
    void start();
  }, [nodeSlug]);

  if (!view && !error && initialPreview) {
    return (
      <div className="lesson-shell">
        {initialPreview.goalStatement ? (
          <div className="lesson-shell__progress">
            <p className="lesson-shell__goal">
              <strong>{initialPreview.goalStatement}</strong>
              {initialPreview.primaryLabel ? ` · ${initialPreview.primaryLabel}` : ""}
            </p>
          </div>
        ) : null}
        <LessonHeader title={initialPreview.title} summary={initialPreview.summary} />
        <LessonContent body={initialPreview.body} />
        <p className="muted">A preparar a sessão…</p>
      </div>
    );
  }

  async function markRead() {
    if (!view) return;
    setPending(true);
    setError(null);
    try {
      const data = await api<StudyView>(`/api/learning/sessions/${view.sessionId}/read`, {
        method: "POST",
      });
      setView(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível gravar a leitura.");
    } finally {
      setPending(false);
    }
  }

  async function submit() {
    if (!view?.question || !choiceId) return;
    setPending(true);
    setError(null);
    try {
      const data = await api<StudyView>(`/api/learning/sessions/${view.sessionId}/check`, {
        method: "POST",
        body: JSON.stringify({ questionId: view.question.id, choiceId }),
      });
      setView(data);
      setChoiceId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível gravar a verificação.");
    } finally {
      setPending(false);
    }
  }

  if (!view && !error) {
    return <p className="muted">A abrir o módulo…</p>;
  }

  if (error && !view) {
    const needsDiagnosis =
      /diagnóstico/i.test(error) || /diagnosis/i.test(error) || /evidência pontual/i.test(error);
    return (
      <div className="lesson-shell">
        <p className="alert alert-error" role="alert">
          {error}
        </p>
        <p className="nav">
          {needsDiagnosis ? (
            <Link className="btn btn-primary" href="/diagnostico">
              Fazer diagnóstico
            </Link>
          ) : null}
          <Link className="btn btn-ghost" href="/mapa">
            Voltar ao mapa
          </Link>
        </p>
      </div>
    );
  }

  if (!view) return null;

  if (view.status === "completed") {
    return (
      <div className="lesson-shell">
        <StudyProgressHeader view={view} />
        {view.last ? (
          <p className={view.last.correct ? "alert alert-ok" : "alert alert-error"} role="status">
            {view.last.correct ? "Verificação correta. " : "Verificação incorreta. "}
            {view.last.explanation}
          </p>
        ) : null}
        <p className="alert alert-ok" role="status">
          Etapa verificada. Segue para prática ou para o mapa.
        </p>
        <LessonHeader title={view.module.title} summary={view.module.summary} />
        <StudyMaterialTabs
          tabs={view.labSlug ? ["texto", "videos", "docs", "pratica"] : ["texto", "videos", "docs"]}
          defaultTab={view.labSlug ? "pratica" : "texto"}
        >
          {(tab) => {
            if (tab === "texto") return <LessonContent body={view.module.body} />;
            if (tab === "videos") return <StudyVideos nodeSlug={nodeSlug} />;
            if (tab === "pratica" && view.labSlug) {
              return (
                <div className="stack" style={{ gap: "0.85rem" }}>
                  <p className="muted" style={{ margin: 0 }}>
                    Resolve problemas desta etapa com evidência — só deste objectivo.
                  </p>
                  <p className="nav">
                    <Link className="btn btn-primary" href={`/lab/${view.labSlug}`}>
                      Abrir prática
                    </Link>
                  </p>
                </div>
              );
            }
            return (
              <p className="nav">
                <Link className="btn btn-primary" href={`/biblioteca?node=${nodeSlug}`}>
                  Documentos desta etapa
                </Link>
              </p>
            );
          }}
        </StudyMaterialTabs>
        <p className="nav">
          {view.labSlug ? (
            <Link className="btn btn-primary" href={`/lab/${view.labSlug}`}>
              Praticar agora
            </Link>
          ) : null}
          <Link className={view.labSlug ? "btn btn-ghost" : "btn btn-primary"} href="/mapa">
            Seguir o mapa
          </Link>
          <Link className="btn btn-ghost" href="/pratica">
            Todas as práticas
          </Link>
        </p>
      </div>
    );
  }

  const tabs = (
    view.read
      ? view.labSlug
        ? (["texto", "videos", "docs", "pratica", "verificar"] as const)
        : (["texto", "videos", "docs", "verificar"] as const)
      : view.labSlug
        ? (["texto", "videos", "docs", "pratica"] as const)
        : (["texto", "videos", "docs"] as const)
  );

  return (
    <div className="lesson-shell">
      <StudyProgressHeader view={view} />
      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}
      {view.warning ? (
        <p className="alert alert-error" role="status">
          {view.warning}
        </p>
      ) : null}

      <LessonHeader title={view.module.title} summary={view.module.summary} />

      <StudyMaterialTabs
        key={view.read ? "com-verificar" : "so-materiais"}
        tabs={[...tabs]}
        defaultTab={view.read ? "verificar" : "texto"}
      >
        {(tab) => {
          if (tab === "texto") {
            const body = view.module.body?.trim() ?? "";
            return (
              <div className="stack" style={{ gap: "1.5rem" }}>
                {body.length > 20 ? (
                  <LessonContent body={body} />
                ) : (
                  <p className="alert" role="status">
                    O texto desta etapa ainda está curto ou a ser gerado. Volta a abrir daqui a
                    momentos, ou escolhe outro nó no mapa.
                  </p>
                )}
                {!view.read ? (
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={markRead}
                    disabled={pending}
                  >
                    {pending ? "A gravar…" : "Terminei de ler — verificar"}
                  </button>
                ) : (
                  <p className="muted">Leitura marcada. Passa a Verificar quando quiseres.</p>
                )}
              </div>
            );
          }
          if (tab === "videos") {
            return <StudyVideos nodeSlug={nodeSlug} />;
          }
          if (tab === "pratica") {
            return (
              <div className="stack" style={{ gap: "0.85rem" }}>
                <p className="muted" style={{ margin: 0 }}>
                  Actividades práticas e resolução de problemas desta etapa.
                </p>
                {view.labSlug ? (
                  <p className="nav">
                    <Link className="btn btn-primary" href={`/lab/${view.labSlug}`}>
                      Abrir prática
                    </Link>
                    <Link className="btn btn-ghost" href="/pratica">
                      Todas as práticas
                    </Link>
                  </p>
                ) : (
                  <p className="muted">Esta etapa ainda não tem lab — vê Prática no menu.</p>
                )}
              </div>
            );
          }
          if (tab === "docs") {
            return (
              <div className="stack" style={{ gap: "1rem" }}>
                {view.resources && view.resources.length > 0 ? (
                  <ul className="lesson-sources">
                    {view.resources.map((item) => (
                      <li key={item.slug}>
                        <a href={item.url} target="_blank" rel="noreferrer noopener">
                          {item.title}
                        </a>
                        <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                          {item.publisher} · {item.kind}
                          {item.summary ? ` — ${item.summary}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Ainda sem documentos ligados a este nó.</p>
                )}
                <p className="nav">
                  <Link className="btn btn-ghost" href={`/biblioteca?node=${nodeSlug}`}>
                    Biblioteca desta etapa
                  </Link>
                </p>
              </div>
            );
          }
          return (
            <div className="lesson-check">
              <p className="muted" style={{ margin: 0 }}>
                Resposta correcta marca evidência neste nó — não domínio de produção.
              </p>
              {view.last ? (
                <p
                  className={view.last.correct ? "alert alert-ok" : "alert alert-error"}
                  role="status"
                >
                  {view.last.correct ? "Correto. " : "Incorreto. "}
                  {view.last.explanation}
                </p>
              ) : null}
              {view.question ? (
                <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend>{view.question.prompt}</legend>
                  {view.question.code ? (
                    <pre className="lesson-code">{view.question.code}</pre>
                  ) : null}
                  <div className="stack" style={{ gap: "0.35rem" }}>
                    {view.question.choices.map((choice) => (
                      <label key={choice.id}>
                        <input
                          type="radio"
                          name="check"
                          value={choice.id}
                          checked={choiceId === choice.id}
                          onChange={() => setChoiceId(choice.id)}
                        />
                        <span>{choice.text}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={submit}
                    disabled={!choiceId || pending}
                  >
                    {pending ? "A gravar…" : "Responder"}
                  </button>
                </fieldset>
              ) : (
                <p className="muted">Conclui a leitura (passo 1) para abrir a verificação.</p>
              )}
            </div>
          );
        }}
      </StudyMaterialTabs>
    </div>
  );
}
