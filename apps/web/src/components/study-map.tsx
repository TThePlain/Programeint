"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";

export type MapNode = {
  slug: string;
  title: string;
  summary: string;
  status: string;
  area?: string;
  sortOrder?: number;
  hasModule?: boolean;
  labSlug?: string | null;
  videoCount?: number;
  prerequisites: Array<{ slug: string; nature: string }>;
};

/** Estado visual simplificado no mapa (legenda). */
export type MapTone = "focus" | "done" | "critical" | "rest";

const STATUS_LABEL: Record<string, string> = {
  unassessed: "Sem evidência",
  passed: "Evidência positiva",
  failed: "Falhou no diagnóstico",
  skipped: "Não perguntado",
  studied: "Módulo verificado",
};

const TONE_LABEL: Record<MapTone, string> = {
  focus: "Em foco",
  done: "Feito",
  critical: "Crítico",
  rest: "No caminho",
};

type LaidOut = {
  node: MapNode;
  tone: MapTone;
  x: number;
  y: number;
  side: "left" | "right";
  index: number;
};

const VB_W = 720;
const NODE_W = 168;
const PANEL_W = 280;
const PANEL_H = 240;
const TOP = 88;
const BOTTOM = 48;
const GAP_MIN = 64;
const GAP_MAX = 88;

function toneFor(
  node: MapNode,
  recommendedSlug: string | null,
  targetSlug: string | null,
): MapTone {
  if (node.status === "failed") return "critical";
  if (node.status === "studied" || node.status === "passed") return "done";
  if (recommendedSlug && node.slug === recommendedSlug) return "focus";
  if (targetSlug && node.slug === targetSlug) return "focus";
  return "rest";
}

function layoutSpine(
  nodes: MapNode[],
  recommendedSlug: string | null,
  targetSlug: string | null,
): { items: LaidOut[]; height: number; cx: number } {
  const sorted = [...nodes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const n = sorted.length;
  const gap =
    n <= 1 ? 0 : Math.min(GAP_MAX, Math.max(GAP_MIN, (560 - TOP - BOTTOM) / Math.max(n - 1, 1)));
  const height = Math.max(420, TOP + (n <= 1 ? 0 : (n - 1) * gap) + BOTTOM + 40);
  const cx = VB_W / 2;
  const items: LaidOut[] = sorted.map((node, index) => {
    const side: "left" | "right" = index % 2 === 0 ? "left" : "right";
    const offset = 118 + (index % 3) * 12;
    const x = side === "left" ? cx - offset : cx + offset;
    const y = n <= 1 ? height / 2 : TOP + index * gap;
    return {
      node,
      tone: toneFor(node, recommendedSlug, targetSlug),
      x,
      y,
      side,
      index,
    };
  });
  return { items, height, cx };
}

function spineEdge(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const midY = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
}

function popoverStyle(item: LaidOut, vbH: number): CSSProperties {
  const pad = 12;
  const gap = 16;
  const wPct = (PANEL_W / VB_W) * 100;
  const hPct = (PANEL_H / vbH) * 100;
  const padX = (pad / VB_W) * 100;
  const padY = (pad / vbH) * 100;

  let leftPct =
    item.side === "left"
      ? ((item.x + NODE_W / 2 + gap) / VB_W) * 100
      : ((item.x - NODE_W / 2 - gap) / VB_W) * 100 - wPct;

  let topPct = (item.y / vbH) * 100 - hPct / 2;

  if (leftPct < padX) leftPct = padX;
  if (leftPct + wPct > 100 - padX) leftPct = 100 - padX - wPct;
  if (topPct < padY) topPct = padY;
  if (topPct + hPct > 100 - padY) topPct = 100 - padY - hPct;

  return {
    left: `${leftPct}%`,
    top: `${topPct}%`,
    width: `${wPct}%`,
    maxHeight: `${hPct}%`,
    transform: "none",
  };
}

export function StudyMap({
  targetTitle,
  targetSlug = null,
  recommendedSlug = null,
  nodes,
  canStudy,
  onSelectSlug,
}: {
  targetTitle: string;
  targetSlug?: string | null;
  recommendedSlug?: string | null;
  nodes: MapNode[];
  canStudy: boolean;
  onSelectSlug?: (slug: string | null) => void;
}) {
  const { items: laidOut, height: vbH, cx } = useMemo(
    () => layoutSpine(nodes, recommendedSlug, targetSlug),
    [nodes, recommendedSlug, targetSlug],
  );
  const [selected, setSelected] = useState<string | null>(
    recommendedSlug ?? targetSlug ?? nodes[0]?.slug ?? null,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const active = laidOut.find((item) => item.node.slug === selected) ?? null;

  function selectSlug(slug: string | null) {
    setSelected(slug);
    onSelectSlug?.(slug);
  }

  useEffect(() => {
    onSelectSlug?.(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only notify initial
  }, []);

  useEffect(() => {
    if (!active || !popoverRef.current) return;
    popoverRef.current.focus({ preventScroll: true });
  }, [active]);

  useEffect(() => {
    if (!selected) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelected(null);
        onSelectSlug?.(null);
      }
    }

    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      setSelected(null);
      onSelectSlug?.(null);
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [selected, onSelectSlug]);

  const legendKeys: MapTone[] = ["focus", "done", "critical", "rest"];

  return (
    <div className="mind-map mind-map--spine" ref={rootRef}>
      <p className="mind-map__hint muted">
        Sequência do objectivo — clica num nó para o conteúdo abaixo.
      </p>
      <div className="mind-map__legend" aria-label="Legenda">
        {legendKeys.map((key) => (
          <span key={key} className={`mind-map__legend-item mind-map__tone--${key}`}>
            {TONE_LABEL[key]}
          </span>
        ))}
      </div>

      <div
        className="mind-map__stage"
        style={{ aspectRatio: `${VB_W} / ${vbH}`, minHeight: Math.min(vbH, 560) }}
      >
        {active ? <div className="mind-map__veil" aria-hidden="true" /> : null}

        <svg
          className="mind-map__svg"
          viewBox={`0 0 ${VB_W} ${vbH}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="mind-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" className="mind-map__arrow" />
            </marker>
          </defs>
          <line
            className="mind-map__spine-line"
            x1={cx}
            y1={36}
            x2={cx}
            y2={vbH - 24}
          />
          {laidOut.slice(0, -1).map((item, i) => {
            const next = laidOut[i + 1];
            if (!next) return null;
            return (
              <path
                key={`edge-${item.node.slug}`}
                d={spineEdge(item, next)}
                className={`mind-map__edge${
                  selected === item.node.slug || selected === next.node.slug ? " is-active" : ""
                }`}
                style={{ animationDelay: `${i * 45}ms` }}
                markerEnd="url(#mind-arrow)"
              />
            );
          })}
        </svg>

        <div
          className="mind-map__center"
          style={{
            left: `${(cx / VB_W) * 100}%`,
            top: "28px",
            transform: "translate(-50%, 0)",
          }}
        >
          <span className="mind-map__center-label">alvo</span>
          {targetTitle}
        </div>

        {laidOut.map((item) => (
          <button
            key={item.node.slug}
            type="button"
            className={`mind-map__node mind-map__tone--${item.tone}${
              selected === item.node.slug ? " is-selected" : ""
            }${item.tone === "focus" ? " is-pulse" : ""}`}
            style={{
              left: `${(item.x / VB_W) * 100}%`,
              top: `${(item.y / vbH) * 100}%`,
              width: `${(NODE_W / VB_W) * 100}%`,
              animationDelay: `${item.index * 40}ms`,
            }}
            aria-expanded={selected === item.node.slug}
            aria-controls={selected === item.node.slug ? `mind-panel-${item.node.slug}` : undefined}
            onClick={() => selectSlug(selected === item.node.slug ? null : item.node.slug)}
            title={`${item.node.title} — ${TONE_LABEL[item.tone]}`}
          >
            <span className="mind-map__node-n" aria-hidden="true">
              {item.index + 1}
            </span>
            <span className="mind-map__node-title">{item.node.title}</span>
            {(item.node.videoCount ?? 0) > 0 ? (
              <span className="mind-map__node-vid" title="Tem vídeos" aria-hidden="true">
                ▶
              </span>
            ) : null}
          </button>
        ))}

        {active ? (
          <aside
            id={`mind-panel-${active.node.slug}`}
            ref={popoverRef}
            className={`mind-map__popover mind-map__popover--${active.side} stack`}
            style={popoverStyle(active, vbH)}
            aria-live="polite"
            tabIndex={-1}
          >
            <button
              type="button"
              className="mind-map__close"
              aria-label="Fechar"
              onClick={() => selectSlug(null)}
            >
              ×
            </button>
            <p className={`mind-map__badge mind-map__tone--${active.tone}`}>
              {TONE_LABEL[active.tone]}
            </p>
            <h2>{active.node.title}</h2>
            <p>{active.node.summary}</p>
            <p className="muted">
              {STATUS_LABEL[active.node.status] ?? active.node.status}
              {active.node.prerequisites.length > 0
                ? ` · pré-requisitos: ${active.node.prerequisites.map((p) => p.slug).join(", ")}`
                : ""}
            </p>
            {canStudy && active.node.hasModule ? (
              <p className="nav">
                <Link className="btn btn-primary" href={`/estudar/${active.node.slug}`}>
                  Estudar
                </Link>
                {active.node.labSlug ? (
                  <Link className="btn btn-ghost" href={`/lab/${active.node.labSlug}`}>
                    Praticar
                  </Link>
                ) : null}
                <a className="btn btn-ghost" href="#mapa-conteudo">
                  Ver abaixo ↓
                </a>
              </p>
            ) : (
              <p className="stack" style={{ gap: "0.35rem" }}>
                <span className="muted">Pré-visualização, vídeos e prática abaixo.</span>
                <a className="btn btn-ghost" href="#mapa-conteudo">
                  Ver conteúdo ↓
                </a>
              </p>
            )}
          </aside>
        ) : null}
      </div>

      <ol className="mind-map__list" aria-label="Sequência do mapa">
        {laidOut.map((item) => (
          <li key={`list-${item.node.slug}`}>
            <button
              type="button"
              className={`mind-map__list-item mind-map__tone--${item.tone}${
                selected === item.node.slug ? " is-selected" : ""
              }`}
              onClick={() => selectSlug(item.node.slug)}
            >
              <span className="mind-map__list-n" aria-hidden="true">
                {item.index + 1}
              </span>
              <span className="mind-map__list-body">
                <strong>{item.node.title}</strong>
                <span className="muted">
                  {TONE_LABEL[item.tone]} · {STATUS_LABEL[item.node.status] ?? item.node.status}
                  {(item.node.videoCount ?? 0) > 0
                    ? ` · ${item.node.videoCount} vídeo${item.node.videoCount === 1 ? "" : "s"}`
                    : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
