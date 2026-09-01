"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { forumPostKindLabel, type ForumPostKind } from "@programeint/shared";
import { ForumChallengeIde } from "@/components/forum-challenge-ide";
import { ApiError, api } from "@/lib/api";

type Author = { id: string; name: string };

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
  replies: Array<{
    id: string;
    body: string;
    createdAt: string;
    author: Author;
  }>;
};

type Solution = {
  id: string;
  code: string;
  note: string | null;
  status: string | null;
  passed: boolean | null;
  exitCode: number | null;
  stdout: string | null;
  stderr: string | null;
  errorCode: string | null;
  createdAt: string;
  author: Author;
};

type PostDetail = {
  id: string;
  kind: ForumPostKind;
  title: string;
  body: string;
  acceptanceCriteria: string | null;
  language: string | null;
  starterCode: string | null;
  hasChecks: boolean;
  entryClass: string;
  timeoutMs: number;
  createdAt: string;
  author: Author;
  comments: Comment[];
  solutions: Solution[];
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ForumPostClient({ postId }: { postId: string }) {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api<{ post: PostDetail }>(
        `/api/forum/posts/${encodeURIComponent(postId)}`,
      );
      setPost(data.post);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível abrir a publicação.");
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitComment(e: FormEvent, parentId?: string) {
    e.preventDefault();
    const body = parentId ? replyBody : commentBody;
    if (!body.trim()) return;
    setPending(true);
    setError(null);
    try {
      await api(`/api/forum/posts/${encodeURIComponent(postId)}/comments`, {
        method: "POST",
        body: JSON.stringify({ body, parentId }),
      });
      if (parentId) {
        setReplyBody("");
        setReplyTo(null);
      } else {
        setCommentBody("");
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? (err.body.message ?? err.message) : "Falha ao comentar.");
    } finally {
      setPending(false);
    }
  }

  if (error && !post) {
    return (
      <div className="forum forum--detail stack">
        <p className="alert alert-error">{error}</p>
        <Link className="btn btn-ghost" href="/forum">
          Voltar ao fórum
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="forum forum--detail">
        <p className="muted">A carregar…</p>
      </div>
    );
  }

  const canSolve = post.kind === "challenge" || post.kind === "help";
  const showIde = canSolve && Boolean(post.starterCode);

  return (
    <article className="forum forum--detail">
      <p className="forum__back">
        <Link href="/forum">← Fórum</Link>
      </p>

      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}

      <header className="forum__post-head">
        <span className={`forum__badge forum__badge--${post.kind}`}>
          {forumPostKindLabel[post.kind]}
        </span>
        <h1 className="forum__h1">{post.title}</h1>
        <p className="forum__byline muted">
          Publicado por <strong>{post.author.name}</strong> · {formatWhen(post.createdAt)}
          {post.language ? ` · ${post.language}` : null}
          {post.hasChecks ? " · testes automatizados" : null}
        </p>
      </header>

      {!showIde ? (
        <>
          <div className="forum__body">{post.body}</div>
          {post.acceptanceCriteria ? (
            <section className="forum__criteria">
              <h2 className="forum__section-title">Critérios de aceitação</h2>
              <div className="forum__body">{post.acceptanceCriteria}</div>
            </section>
          ) : null}
        </>
      ) : null}

      {showIde ? (
        <ForumChallengeIde
          postId={post.id}
          title={post.title}
          brief={post.body}
          acceptanceCriteria={post.acceptanceCriteria}
          starterCode={post.starterCode!}
          hasChecks={post.hasChecks}
          onPublished={() => void load()}
        />
      ) : null}

      {post.solutions.length > 0 ? (
        <section className="stack" style={{ gap: "0.85rem" }}>
          <h2 className="forum__section-title">Soluções da comunidade</h2>
          <ul className="forum__solutions">
            {post.solutions.map((s) => (
              <li key={s.id} className="forum__solution">
                <div className="forum__solution-head">
                  <p className="forum__byline muted" style={{ margin: 0 }}>
                    <strong>{s.author.name}</strong> · {formatWhen(s.createdAt)}
                  </p>
                  {s.passed != null ? (
                    <span
                      className={`forum__run-pill${s.passed ? " is-ok" : " is-fail"}`}
                    >
                      {s.passed ? "PASS" : "FAIL"}
                    </span>
                  ) : null}
                </div>
                {s.note ? <p style={{ margin: "0.35rem 0" }}>{s.note}</p> : null}
                <pre className="code-block forum__code-block" tabIndex={0}>
                  {s.code}
                </pre>
                {s.stdout || s.stderr ? (
                  <details className="forum__run-details">
                    <summary>Saída da execução</summary>
                    {s.stdout ? (
                      <pre className="ide__console-out" tabIndex={0}>
                        {s.stdout}
                      </pre>
                    ) : null}
                    {s.stderr ? (
                      <pre className="ide__console-out ide__console-out--err" tabIndex={0}>
                        {s.stderr}
                      </pre>
                    ) : null}
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="stack forum__comments" style={{ gap: "0.85rem" }}>
        <h2 className="forum__section-title">Comentários</h2>

        <form className="stack" onSubmit={(e) => void submitComment(e)}>
          <label className="field">
            <span>Novo comentário</span>
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              required
              rows={3}
              placeholder="Partilha a tua ideia, dúvida ou revisão…"
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={pending}>
            Comentar
          </button>
        </form>

        {post.comments.length === 0 ? (
          <p className="muted">Ainda sem comentários.</p>
        ) : (
          <ul className="forum__thread">
            {post.comments.map((c) => (
              <li key={c.id} className="forum__comment">
                <p className="forum__byline muted" style={{ margin: 0 }}>
                  <strong>{c.author.name}</strong> · {formatWhen(c.createdAt)}
                </p>
                <p style={{ margin: "0.35rem 0 0.5rem", whiteSpace: "pre-wrap" }}>{c.body}</p>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                >
                  Responder
                </button>

                {replyTo === c.id ? (
                  <form
                    className="stack forum__reply-form"
                    onSubmit={(e) => void submitComment(e, c.id)}
                  >
                    <label className="field">
                      <span>Resposta a {c.author.name}</span>
                      <textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        required
                        rows={2}
                      />
                    </label>
                    <button className="btn btn-primary" type="submit" disabled={pending}>
                      Enviar resposta
                    </button>
                  </form>
                ) : null}

                {c.replies.length > 0 ? (
                  <ul className="forum__replies">
                    {c.replies.map((r) => (
                      <li key={r.id} className="forum__comment forum__comment--reply">
                        <p className="forum__byline muted" style={{ margin: 0 }}>
                          <strong>{r.author.name}</strong> · {formatWhen(r.createdAt)}
                        </p>
                        <p style={{ margin: "0.35rem 0 0", whiteSpace: "pre-wrap" }}>{r.body}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
