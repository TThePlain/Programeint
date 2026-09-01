"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CHALLENGE_CHECK,
  DEFAULT_CHALLENGE_STARTER,
  FORUM_POST_KINDS,
  forumPostKindLabel,
  type ForumPostKind,
} from "@programeint/shared";
import { ApiError, api } from "@/lib/api";

type ForumListItem = {
  id: string;
  kind: ForumPostKind;
  title: string;
  bodyPreview: string;
  language: string | null;
  hasChecks?: boolean;
  createdAt: string;
  author: { id: string; name: string };
  commentCount: number;
  solutionCount: number;
};

type ListResponse = { posts: ForumListItem[] };

export function ForumClient() {
  const [posts, setPosts] = useState<ForumListItem[] | null>(null);
  const [filter, setFilter] = useState<ForumPostKind | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  const [kind, setKind] = useState<ForumPostKind>("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [acceptance, setAcceptance] = useState("");
  const [starterCode, setStarterCode] = useState(DEFAULT_CHALLENGE_STARTER);
  const [checkCode, setCheckCode] = useState(DEFAULT_CHALLENGE_CHECK);

  const isChallenge = kind === "challenge";
  const needsCode = kind === "challenge" || kind === "help";

  async function load(nextFilter: ForumPostKind | "all" = filter) {
    setError(null);
    try {
      const q = nextFilter === "all" ? "" : `?kind=${encodeURIComponent(nextFilter)}`;
      const data = await api<ListResponse>(`/api/forum/posts${q}`);
      setPosts(data.posts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar o fórum.");
      setPosts([]);
    }
  }

  useEffect(() => {
    void load("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (kind === "challenge") {
      setStarterCode((prev) => (prev.trim() ? prev : DEFAULT_CHALLENGE_STARTER));
      setCheckCode((prev) => (prev.trim() ? prev : DEFAULT_CHALLENGE_CHECK));
    }
  }, [kind]);

  const empty = useMemo(() => posts !== null && posts.length === 0, [posts]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const created = await api<{ post: { id: string } }>("/api/forum/posts", {
        method: "POST",
        body: JSON.stringify({
          kind,
          title,
          body,
          acceptanceCriteria: isChallenge ? acceptance || undefined : undefined,
          language: needsCode ? "java" : undefined,
          starterCode: needsCode ? starterCode : undefined,
          checkCode: isChallenge ? checkCode : undefined,
          entryClass: isChallenge ? "Check" : undefined,
        }),
      });
      window.location.assign(`/forum/${created.post.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? (err.body.message ?? err.message) : "Falha ao publicar.");
      setPending(false);
    }
  }

  function chooseFilter(next: ForumPostKind | "all") {
    setFilter(next);
    void load(next);
  }

  return (
    <div className="forum">
      <header className="forum__intro">
        <p className="forum__eyebrow">Comunidade</p>
        <h1 className="forum__h1">Fórum</h1>
        <p className="muted forum__lede">
          Discussão, ajuda e desafios com execução real — como um ticket de trabalho: brief,
          critérios, código e testes.
        </p>
      </header>

      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="forum__toolbar">
        <div className="forum__filters" role="tablist" aria-label="Tipo de publicação">
          <button
            type="button"
            role="tab"
            aria-selected={filter === "all"}
            className={`forum__chip${filter === "all" ? " is-active" : ""}`}
            onClick={() => chooseFilter("all")}
          >
            Tudo
          </button>
          {FORUM_POST_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={filter === k}
              className={`forum__chip${filter === k ? " is-active" : ""}`}
              onClick={() => chooseFilter(k)}
            >
              {forumPostKindLabel[k]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setComposeOpen((v) => !v)}
        >
          {composeOpen ? "Fechar" : "Nova publicação"}
        </button>
      </div>

      {composeOpen ? (
        <section className="forum__compose card stack" aria-label="Nova publicação">
          <header className="forum__compose-head">
            <h2 className="forum__section-title">Publicar</h2>
            <p className="muted" style={{ margin: 0 }}>
              {isChallenge
                ? "Cria um desafio com Solution + Check — os outros correm no IDE e vêem PASS/FAIL."
                : "Partilha uma ideia ou pede ajuda à comunidade."}
            </p>
          </header>

          <form className="stack" onSubmit={onCreate}>
            <div className="forum__kind-row" role="group" aria-label="Tipo">
              {FORUM_POST_KINDS.map((k) => (
                <label key={k} className={`forum__kind${kind === k ? " is-active" : ""}`}>
                  <input
                    type="radio"
                    name="forum-kind"
                    value={k}
                    checked={kind === k}
                    onChange={() => setKind(k)}
                  />
                  {forumPostKindLabel[k]}
                </label>
              ))}
            </div>

            <label className="field">
              <span>{isChallenge ? "Título do ticket" : "Título"}</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={3}
                maxLength={200}
                placeholder={
                  isChallenge
                    ? "Ex.: [BE] Dobrar valores sem usar * 2"
                    : kind === "help"
                      ? "Ex.: NullPointer ao mapear lista"
                      : "Ex.: Como organizam reviews de código?"
                }
              />
            </label>

            <label className="field">
              <span>{isChallenge ? "Brief / enunciado" : "Mensagem"}</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                minLength={8}
                rows={isChallenge ? 5 : 4}
                placeholder={
                  isChallenge
                    ? "Contexto, regras, exemplos de entrada/saída, o que já está fora de âmbito…"
                    : "Explica o contexto…"
                }
              />
            </label>

            {isChallenge ? (
              <label className="field">
                <span>Critérios de aceitação</span>
                <textarea
                  value={acceptance}
                  onChange={(e) => setAcceptance(e.target.value)}
                  rows={3}
                  placeholder={
                    "- solve(2) → 4\n- solve(5) → 10\n- Sem usar operador * com literal 2"
                  }
                />
              </label>
            ) : null}

            {needsCode ? (
              <>
                <label className="field">
                  <span>
                    {isChallenge ? "Solution.java (starter)" : "Trecho / código partilhado"}
                  </span>
                  <textarea
                    className="forum__code"
                    value={starterCode}
                    onChange={(e) => setStarterCode(e.target.value)}
                    required={isChallenge}
                    rows={12}
                    spellCheck={false}
                  />
                </label>
                {isChallenge ? (
                  <label className="field">
                    <span>Check.java (testes ocultos — não vistos pelos resolvers)</span>
                    <textarea
                      className="forum__code"
                      value={checkCode}
                      onChange={(e) => setCheckCode(e.target.value)}
                      required
                      rows={12}
                      spellCheck={false}
                    />
                  </label>
                ) : null}
              </>
            ) : null}

            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? "A publicar…" : isChallenge ? "Publicar desafio" : "Publicar"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="forum__feed" aria-label="Publicações">
        <h2 className="forum__section-title">Conversas</h2>
        {posts === null ? (
          <p className="muted">A carregar…</p>
        ) : empty ? (
          <p className="muted">Ainda sem publicações neste filtro. Sê o primeiro.</p>
        ) : (
          <ul className="forum__list">
            {posts.map((post) => (
              <li key={post.id}>
                <Link className="forum__item" href={`/forum/${post.id}`}>
                  <div className="forum__item-top">
                    <span className={`forum__badge forum__badge--${post.kind}`}>
                      {forumPostKindLabel[post.kind]}
                    </span>
                    {post.hasChecks ? (
                      <span className="forum__badge forum__badge--run">IDE · testes</span>
                    ) : null}
                  </div>
                  <strong className="forum__item-title">{post.title}</strong>
                  <span className="muted forum__item-preview">{post.bodyPreview}</span>
                  <span className="forum__item-meta muted">
                    {post.author.name}
                    {" · "}
                    {new Date(post.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {post.commentCount} comentário{post.commentCount === 1 ? "" : "s"}
                    {post.kind !== "discussion"
                      ? ` · ${post.solutionCount} solução${post.solutionCount === 1 ? "" : "ões"}`
                      : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
