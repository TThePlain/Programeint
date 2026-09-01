"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StudyMap, type MapNode } from "@/components/study-map";
import { StudyMaterialTabs } from "@/components/study-material-tabs";
import { StudyVideos } from "@/components/study-videos";

export type MapPanelNode = MapNode & {
  videoCount?: number;
  modulePreview?: string | null;
  labSlug?: string | null;
};

export function MapStudyPanel({
  targetTitle,
  targetSlug,
  recommendedSlug,
  nodes,
  canStudy,
}: {
  targetTitle: string;
  targetSlug: string | null;
  recommendedSlug: string | null;
  nodes: MapPanelNode[];
  canStudy: boolean;
  progressPct?: number;
}) {
  const initial = recommendedSlug ?? targetSlug ?? nodes[0]?.slug ?? null;
  const [videoSlug, setVideoSlug] = useState<string | null>(initial);
  const contentRef = useRef<HTMLElement>(null);
  const skipScroll = useRef(true);

  const active = nodes.find((n) => n.slug === videoSlug) ?? null;
  const activeTitle = active?.title ?? (videoSlug ? videoSlug : "nó do mapa");
  const tabs = active?.labSlug
    ? (["videos", "texto", "pratica", "docs"] as const)
    : (["videos", "texto", "docs"] as const);

  useEffect(() => {
    if (!videoSlug || !contentRef.current) return;
    if (skipScroll.current) {
      skipScroll.current = false;
      return;
    }
    contentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [videoSlug]);

  return (
    <div className="map-panel map-panel--docked">
      <StudyMap
        targetTitle={targetTitle}
        targetSlug={targetSlug}
        recommendedSlug={recommendedSlug ?? targetSlug ?? nodes[0]?.slug ?? null}
        nodes={nodes}
        canStudy={canStudy}
        onSelectSlug={(slug) => {
          if (slug) setVideoSlug(slug);
        }}
      />

      {videoSlug ? (
        <section ref={contentRef} id="mapa-conteudo" className="map-panel__content">
          <header className="map-panel__content-head">
            <p className="map-panel__content-label">Etapa seleccionada</p>
            <h2 className="map-panel__content-title">{activeTitle}</h2>
            <p className="muted map-panel__content-hint">
              Vídeos para acompanhar esta matéria — escolhe outro nó no mapa para mudar.
              {typeof active?.videoCount === "number" && active.videoCount > 0
                ? ` · ${active.videoCount} vídeo${active.videoCount === 1 ? "" : "s"}`
                : null}
            </p>
          </header>

          <StudyMaterialTabs key={videoSlug} tabs={[...tabs]} defaultTab="videos">
            {(tab) => {
              if (tab === "videos") {
                return (
                  <div className="map-panel__videos">
                    <StudyVideos key={videoSlug} nodeSlug={videoSlug} />
                  </div>
                );
              }
              if (tab === "texto") {
                return (
                  <div className="stack" style={{ gap: "1.15rem" }}>
                    {active?.modulePreview ? (
                      <p className="lesson-preview">
                        {active.modulePreview}
                        {active.modulePreview.length >= 300 ? "…" : ""}
                      </p>
                    ) : active?.summary ? (
                      <p className="lesson-preview">{active.summary}</p>
                    ) : (
                      <p className="muted">Sem pré-visualização — abre o texto completo.</p>
                    )}
                    <p className="nav">
                      <Link className="btn btn-primary" href={`/estudar/${videoSlug}`}>
                        Ler texto completo
                      </Link>
                    </p>
                  </div>
                );
              }
              if (tab === "pratica") {
                return (
                  <div className="stack" style={{ gap: "0.85rem" }}>
                    <p className="muted" style={{ margin: 0 }}>
                      Resolve problemas desta etapa com evidência.
                    </p>
                    <p className="nav">
                      {active?.labSlug ? (
                        <Link className="btn btn-primary" href={`/lab/${active.labSlug}`}>
                          Abrir prática
                        </Link>
                      ) : (
                        <Link className="btn btn-primary" href="/pratica">
                          Ver práticas do objectivo
                        </Link>
                      )}
                    </p>
                  </div>
                );
              }
              return (
                <div className="stack" style={{ gap: "0.85rem" }}>
                  <p className="muted" style={{ margin: 0 }}>
                    Fontes da biblioteca filtradas por esta etapa.
                  </p>
                  <p className="nav">
                    <Link className="btn btn-primary" href={`/biblioteca?node=${videoSlug}`}>
                      Abrir documentos
                    </Link>
                  </p>
                </div>
              );
            }}
          </StudyMaterialTabs>
        </section>
      ) : null}
    </div>
  );
}
