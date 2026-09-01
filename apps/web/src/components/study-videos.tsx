"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, api } from "@/lib/api";

type StudyVideo = {
  id: string;
  title: string;
  channel: string;
  youtubeId: string;
  playlistId?: string | null;
  language: string;
  languageLabel: string;
  embedUrl: string;
  isPlaylist?: boolean;
};

type VideosView = {
  node: { slug: string; title: string };
  languages: Array<{ id: string; label: string }>;
  videos: StudyVideo[];
  policy: string;
};

const LANG_STORAGE = "programeint.studyVideoLang";

function readStoredLang(available: string[]): string {
  if (typeof window === "undefined") return available[0] ?? "pt";
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE);
    if (stored && available.includes(stored)) return stored;
  } catch {
    /* ignore */
  }
  if (available.includes("pt")) return "pt";
  return available[0] ?? "pt";
}

function playUrl(video: StudyVideo): string {
  const base = video.embedUrl;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}autoplay=1`;
}

export function StudyVideos({ nodeSlug }: { nodeSlug: string }) {
  const [view, setView] = useState<VideosView | null>(null);
  const [lang, setLang] = useState<string>("pt");
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPlaying(false);
    setView(null);
    setError(null);
    setAttempts(0);

    async function load(attempt: number) {
      try {
        const data = await api<VideosView>(`/api/learning/videos/${encodeURIComponent(nodeSlug)}`);
        if (cancelled) return;
        setView(data);
        const available = data.languages.map((item) => item.id);
        setLang(readStoredLang(available));
        setAttempts(attempt);
        if (data.videos.length === 0 && attempt < 4) {
          window.setTimeout(() => {
            if (!cancelled) void load(attempt + 1);
          }, 2500);
        }
      } catch (err) {
        if (cancelled) return;
        if (attempt < 3) {
          window.setTimeout(() => {
            if (!cancelled) void load(attempt + 1);
          }, 2000);
          return;
        }
        setError(err instanceof ApiError ? err.message : "Não foi possível carregar os vídeos.");
      }
    }

    void load(0);
    return () => {
      cancelled = true;
    };
  }, [nodeSlug]);

  /** Um único vídeo para a língua seleccionada — sem cair noutra língua. */
  const video = useMemo(() => {
    if (!view) return null;
    return view.videos.find((item) => item.language === lang) ?? null;
  }, [view, lang]);

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlaying(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [playing]);

  function chooseLang(next: string) {
    setLang(next);
    setPlaying(false);
    try {
      window.localStorage.setItem(LANG_STORAGE, next);
    } catch {
      /* ignore */
    }
  }

  async function retry() {
    setError(null);
    setView(null);
    setPlaying(false);
    try {
      const data = await api<VideosView>(`/api/learning/videos/${encodeURIComponent(nodeSlug)}`);
      setView(data);
      setLang(readStoredLang(data.languages.map((item) => item.id)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar os vídeos.");
    }
  }

  if (error) {
    return (
      <div className="stack">
        <p className="alert alert-error" role="status">
          {error}
        </p>
        <button type="button" className="btn btn-ghost" onClick={() => void retry()}>
          Tentar outra vez
        </button>
      </div>
    );
  }

  if (!view) {
    return <p className="muted">A carregar vídeo desta etapa…</p>;
  }

  if (view.videos.length === 0) {
    return (
      <div className="stack">
        <p className="muted" role="status">
          A procurar um vídeo para esta etapa
          {attempts > 0 ? ` (tentativa ${attempts + 1})` : ""}…
        </p>
        <button type="button" className="btn btn-ghost" onClick={() => void retry()}>
          Procurar outra vez
        </button>
      </div>
    );
  }

  return (
    <section className="study-videos study-videos--stage stack" style={{ gap: "0.75rem" }}>
      {view.languages.length > 1 ? (
        <div className="study-videos__langs" role="tablist" aria-label="Língua do vídeo">
          {view.languages.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={lang === item.id}
              className={`study-videos__lang${lang === item.id ? " is-active" : ""}`}
              onClick={() => chooseLang(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {!video ? (
        <p className="muted" role="status">
          Sem vídeo nesta língua para esta etapa.
        </p>
      ) : (
        <button
          type="button"
          className="study-videos__stage-card"
          onClick={() => setPlaying(true)}
          aria-label={`Reproduzir: ${video.title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="study-videos__stage-thumb"
            src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
            alt=""
            width={320}
            height={180}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
          <span className="study-videos__stage-play" aria-hidden="true">
            ▶
          </span>
          <span className="study-videos__stage-meta">
            <strong>{video.title}</strong>
            <span className="muted">
              {video.channel} · {video.languageLabel}
              {video.isPlaylist || video.playlistId ? " · playlist completa" : ""}
            </span>
          </span>
        </button>
      )}

      {playing && video ? (
        <div
          className="study-videos__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={video.title}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPlaying(false);
          }}
        >
          <div className="study-videos__lightbox-panel">
            <div className="study-videos__lightbox-bar">
              <p style={{ margin: 0 }}>
                <strong>{video.title}</strong>
                <span className="muted">
                  {" "}
                  · {video.channel}
                  {video.isPlaylist || video.playlistId ? " · playlist" : ""}
                </span>
              </p>
              <button type="button" className="btn btn-ghost" onClick={() => setPlaying(false)}>
                Fechar
              </button>
            </div>
            <div className="study-videos__player study-videos__player--expanded">
              <iframe
                title={video.title}
                src={playUrl(video)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
