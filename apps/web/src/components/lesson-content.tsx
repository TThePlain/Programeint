"use client";

import { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re =
    /(!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) {
      nodes.push(<span key={key++}>{text.slice(last, match.index)}</span>);
    }
    if (match[3]) {
      nodes.push(
        // eslint-disable-next-line @next/next/no-img-element -- imagens da pesquisa (Wikipedia/DDG)
        <img
          key={key++}
          className="lesson-img"
          src={match[3]}
          alt={match[2] || ""}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />,
      );
    } else if (match[4] && match[5]) {
      nodes.push(
        <a key={key++} href={match[5]} target="_blank" rel="noreferrer noopener">
          {match[4]}
        </a>,
      );
    } else if (match[6]) {
      nodes.push(<strong key={key++}>{match[6]}</strong>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(<span key={key++}>{text.slice(last)}</span>);
  return nodes;
}

function renderBlocks(markdown: string): ReactNode[] {
  const chunks = markdown.split(/```/);
  const out: ReactNode[] = [];
  chunks.forEach((chunk, index) => {
    if (index % 2 === 1) {
      const lines = chunk.replace(/^\w*\n/, "");
      out.push(
        <pre key={`code-${index}`} className="lesson-code">
          {lines.trim()}
        </pre>,
      );
      return;
    }
    chunk
      .split("\n\n")
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((paragraph, pIndex) => {
        const key = `${index}-${pIndex}`;
        if (paragraph.startsWith("# ")) return;
        if (/^!\[[^\]]*\]\(https?:\/\/[^)\s]+\)$/.test(paragraph)) {
          out.push(
            <figure key={key} className="lesson-figure">
              {renderInline(paragraph)}
            </figure>,
          );
          return;
        }
        if (paragraph.startsWith("## ")) {
          out.push(
            <h3 key={key} className="lesson-h">
              {paragraph.slice(3)}
            </h3>,
          );
          return;
        }
        if (paragraph.startsWith("### ")) {
          out.push(
            <h4 key={key} className="lesson-h4">
              {paragraph.slice(4)}
            </h4>,
          );
          return;
        }
        if (paragraph.startsWith("> ")) {
          out.push(
            <p key={key} className="lesson-note">
              {renderInline(paragraph.replace(/^>\s?/gm, ""))}
            </p>,
          );
          return;
        }
        if (/^[-*]\s/.test(paragraph) || /^\d+\.\s/.test(paragraph)) {
          const items = paragraph.split("\n").filter(Boolean);
          out.push(
            <ul key={key} className="lesson-list">
              {items.map((item, i) => (
                <li key={`${key}-${i}`}>
                  {renderInline(item.replace(/^([-*]|\d+\.)\s+/, ""))}
                </li>
              ))}
            </ul>,
          );
          return;
        }
        if (/^\*\*O teu objectivo:\*\*/i.test(paragraph) || /^\*\*Este nó/i.test(paragraph)) {
          out.push(
            <p key={key} className="lesson-meta">
              {renderInline(paragraph)}
            </p>,
          );
          return;
        }
        out.push(
          <p key={key} className="lesson-p">
            {renderInline(paragraph)}
          </p>,
        );
      });
  });
  return out;
}

/**
 * Leitura calma: secções por ##, tipografia larga, sem parede de markdown cru.
 */
export function LessonContent({ body }: { body: string }) {
  const cleaned = body.replace(/^\s*# [^\n]+\n+/, "").trim();
  const sections = cleaned.split(/\n(?=## )/);
  if (sections.length <= 1) {
    return <div className="lesson-read">{renderBlocks(cleaned)}</div>;
  }

  return (
    <div className="lesson-read">
      {sections.map((section, i) => {
        const trimmed = section.trim();
        if (!trimmed) return null;
        if (!trimmed.startsWith("## ")) {
          return (
            <div key={i} className="lesson-lead">
              {renderBlocks(trimmed)}
            </div>
          );
        }
        const nl = trimmed.indexOf("\n");
        const title = (nl === -1 ? trimmed : trimmed.slice(0, nl)).replace(/^##\s+/, "");
        const rest = nl === -1 ? "" : trimmed.slice(nl + 1).trim();
        return (
          <section key={i} className="lesson-block">
            <h3 className="lesson-block__title">{title}</h3>
            {rest ? <div className="lesson-block__body">{renderBlocks(rest)}</div> : null}
          </section>
        );
      })}
    </div>
  );
}
