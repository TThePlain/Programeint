"use client";

import { ReactNode, useState } from "react";

export type StudyMaterialTab = "texto" | "videos" | "docs" | "pratica" | "verificar";

const STEPS: Record<StudyMaterialTab, { n: string; label: string }> = {
  texto: { n: "1", label: "Ler" },
  videos: { n: "2", label: "Vídeos" },
  docs: { n: "3", label: "Fontes" },
  pratica: { n: "4", label: "Praticar" },
  verificar: { n: "5", label: "Verificar" },
};

/**
 * Passos silenciosos da aula — um de cada vez, sem parecer dashboard.
 */
export function StudyMaterialTabs({
  tabs,
  defaultTab = "texto",
  children,
}: {
  tabs: StudyMaterialTab[];
  defaultTab?: StudyMaterialTab;
  children: (tab: StudyMaterialTab) => ReactNode;
}) {
  const initial = tabs.includes(defaultTab) ? defaultTab : tabs[0]!;
  const [tab, setTab] = useState<StudyMaterialTab>(initial);

  return (
    <div className="lesson-steps">
      <nav className="lesson-steps__nav" aria-label="Passos da aula">
        {tabs.map((id, index) => {
          const step = STEPS[id];
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              className={`lesson-steps__item${active ? " is-active" : ""}`}
              aria-current={active ? "step" : undefined}
              onClick={() => setTab(id)}
            >
              <span className="lesson-steps__n" aria-hidden="true">
                {index + 1}
              </span>
              <span className="lesson-steps__label">{step.label}</span>
              {index < tabs.length - 1 ? (
                <span className="lesson-steps__gap" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </nav>
      <div className="lesson-steps__body">{children(tab)}</div>
    </div>
  );
}
