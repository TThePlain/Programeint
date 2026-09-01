"use client";

export type CareerTrackView = {
  slug: string;
  roleTitle: string;
  careerType: string;
  whatItsLike: string;
  whatYouDo: string[];
  meetings: Array<{ name: string; purpose: string }>;
  softSkills: Array<{ name: string; how: string }>;
  coreFramework: { name: string; why: string };
  complementary: Array<{ name: string; why: string }>;
  fullStackPath: Array<{ layer: string; items: string; why: string }>;
  workTools: Array<{ name: string; why: string }>;
};

/**
 * Painel de carreira de desenvolvedor: papel, stack, soft skills, dia-a-dia.
 * Complementa o mapa — não mistura outros objectivos.
 */
export function CareerTrackPanel({ career }: { career: CareerTrackView }) {
  return (
    <section className="career-track stack">
      <header className="career-track__head">
        <p className="muted" style={{ margin: 0 }}>
          Carreira de desenvolvedor
        </p>
        <h2 style={{ margin: 0 }}>{career.roleTitle}</h2>
        <p className="muted">{career.careerType}</p>
      </header>

      <p>{career.whatItsLike}</p>

      <div className="career-track__grid">
        <div>
          <h3>O que fazes no trabalho</h3>
          <ul>
            {career.whatYouDo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Reuniões e rituais</h3>
          <ul>
            {career.meetings.map((m) => (
              <li key={m.name}>
                <strong>{m.name}</strong> — {m.purpose}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="career-track__grid">
        <div>
          <h3>Framework / ecossistema</h3>
          <p>
            <strong>{career.coreFramework.name}</strong> — {career.coreFramework.why}
          </p>
          <h3>Materiais complementares</h3>
          <ul>
            {career.complementary.map((item) => (
              <li key={item.name}>
                <strong>{item.name}</strong> — {item.why}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Caminho full-stack</h3>
          <ul>
            {career.fullStackPath.map((layer) => (
              <li key={layer.layer}>
                <strong>{layer.layer}:</strong> {layer.items}
                <span className="muted"> — {layer.why}</span>
              </li>
            ))}
          </ul>
          <h3>Soft skills</h3>
          <ul>
            {career.softSkills.map((skill) => (
              <li key={skill.name}>
                <strong>{skill.name}</strong> — {skill.how}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h3>Ferramentas do ofício</h3>
        <ul className="career-track__tools">
          {career.workTools.map((tool) => (
            <li key={tool.name}>
              <strong>{tool.name}</strong> — {tool.why}
            </li>
          ))}
        </ul>
      </div>

      <p className="nav">
        <a className="btn btn-primary" href="/simulador">
          Treinar no simulador (daily · ticket · PR)
        </a>
      </p>
    </section>
  );
}
