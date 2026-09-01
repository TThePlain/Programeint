"use client";

import { useEffect, useMemo, useState } from "react";
import {
  NEWS_CATEGORIES,
  newsCategoryLabel,
  type NewsCategory,
  type TechNewsItem,
} from "@programeint/shared";
import { ApiError, api } from "@/lib/api";

const PAGE_SIZE = 6;

type NewsResponse = {
  refreshedAt: string;
  nextRefreshAt: string;
  category: NewsCategory;
  total: number;
  items: TechNewsItem[];
};

function formatWhen(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NewsClient() {
  const [category, setCategory] = useState<NewsCategory>("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(next: NewsCategory) {
    setLoading(true);
    setError(null);
    try {
      const q = next === "all" ? "" : `?category=${encodeURIComponent(next)}`;
      const res = await api<NewsResponse>(`/api/news${q}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar as notícias.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
    void load(category);
  }, [category]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!data?.nextRefreshAt) return;
      if (Date.parse(data.nextRefreshAt) <= Date.now()) void load(category);
    }, 60_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.nextRefreshAt, category]);

  const ordered = useMemo(() => {
    const items = data?.items ?? [];
    const withPhoto = items.filter((i) => i.imageUrl);
    const withoutPhoto = items.filter((i) => !i.imageUrl);
    return [...withPhoto, ...withoutPhoto];
  }, [data?.items]);

  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = ordered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="news">
      <header className="news__intro">
        <p className="news__eyebrow">Actualidade</p>
        <h1 className="news__h1">News</h1>
        <p className="muted news__lede">
          Programação, tecnologia e actualizações do ramo — para quem está a aprender e a
          construir.
        </p>
      </header>

      <div className="news__filters" role="tablist" aria-label="Categorias">
        {NEWS_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={category === cat}
            className={`news__chip${category === cat ? " is-active" : ""}`}
            onClick={() => setCategory(cat)}
          >
            {newsCategoryLabel[cat]}
          </button>
        ))}
      </div>

      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading && !data ? <p className="muted news__status">A carregar…</p> : null}

      {!loading && data && ordered.length === 0 ? (
        <p className="muted news__status">Sem notícias neste filtro.</p>
      ) : null}

      {visible.length > 0 ? (
        <>
          <ul className="news__list">
            {visible.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </ul>

          {totalPages > 1 ? (
            <nav className="news__pager" aria-label="Páginas de notícias">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={safePage <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                ← Anterior
              </button>
              <span className="news__pager-label muted">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={safePage >= totalPages}
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Seguinte →
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function NewsCard({ item }: { item: TechNewsItem }) {
  const when = formatWhen(item.publishedAt);
  return (
    <li>
      <a className="news__card" href={item.url} target="_blank" rel="noopener noreferrer">
        <div className="news__media">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="news__img"
              src={item.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className={`news__img-fallback news__img-fallback--${item.category}`}>
              {item.source.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="news__body">
          <p className="news__kicker">
            <span className={`news__badge news__badge--${item.category}`}>
              {newsCategoryLabel[item.category]}
            </span>
            <span className="news__source">{item.source}</span>
            {when ? <span className="news__when">{when}</span> : null}
          </p>
          <h2 className="news__title">{item.title}</h2>
          <p className="news__summary">{item.summary}</p>
          <span className="news__cta">Ler na fonte →</span>
        </div>
      </a>
    </li>
  );
}
