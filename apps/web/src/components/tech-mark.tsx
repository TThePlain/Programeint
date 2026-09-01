"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { resolveTechVisual } from "@/lib/tech-visual";

export function TechMark({
  slug,
  label,
  statement,
  size = 72,
  className = "",
}: {
  slug?: string | null;
  label?: string | null;
  statement?: string | null;
  size?: number;
  className?: string;
}) {
  const visual = resolveTechVisual(slug, label, statement);
  const [src, setSrc] = useState(visual.iconUrl);
  const iconSize = Math.round(size * 0.72);

  useEffect(() => {
    setSrc(visual.iconUrl);
  }, [visual.iconUrl]);

  return (
    <span
      className={`tech-mark ${className}`.trim()}
      style={
        {
          width: size,
          height: size,
          "--tech-accent": visual.accent,
          "--tech-soft": visual.accentSoft,
        } as CSSProperties
      }
      title={visual.label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- logos CDN externos */}
      <img
        className="tech-mark__img"
        src={src}
        alt={visual.label}
        width={iconSize}
        height={iconSize}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          if (src !== visual.iconFallback) setSrc(visual.iconFallback);
        }}
      />
    </span>
  );
}

export function GoalBanner({
  statement,
  targetSlug,
  targetLabel,
  eyebrow = "Objectivo em foco",
  compact = false,
  centered = false,
}: {
  statement: string;
  targetSlug?: string | null;
  targetLabel?: string | null;
  eyebrow?: string;
  compact?: boolean;
  centered?: boolean;
}) {
  const visual = resolveTechVisual(targetSlug, targetLabel, statement);
  return (
    <article
      className={`goal-banner${compact ? " goal-banner--compact" : ""}${
        centered ? " goal-banner--centered" : ""
      }`}
    >
      <TechMark
        slug={targetSlug}
        label={targetLabel}
        statement={statement}
        size={centered ? 96 : compact ? 56 : 84}
        className="goal-banner__mark"
      />
      <div className="goal-banner__copy">
        <p className="goal-banner__eyebrow">{eyebrow}</p>
        <p className="goal-banner__tech" style={{ color: visual.accent }}>
          {visual.label}
        </p>
        <h2 className="goal-banner__statement">{statement}</h2>
      </div>
    </article>
  );
}
