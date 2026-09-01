import Link from "next/link";
import { redirect } from "next/navigation";
import { STUDY_PROGRAM_STAGES } from "@programeint/shared";
import { GoalSwitcher } from "@/components/goal-switcher";
import { GoalBanner } from "@/components/tech-mark";
import { getLibrary, type LibraryItem } from "@/lib/library";
import { getOnboarding } from "@/lib/onboarding";
import { getRoadmap } from "@/lib/roadmap";
import { getSessionUser } from "@/lib/session";

const KIND_LABEL: Record<string, string> = {
  docs: "Documentação",
  book: "Livro",
  article: "Artigo",
  video: "Vídeo",
  spec: "Especificação",
  course: "Curso",
};

const LANGUAGE_LABEL: Record<string, string> = {
  "pt-BR": "Português",
  en: "Inglês",
};

function ResourceCard({ item }: { item: LibraryItem }) {
  return (
    <li className="node-item">
      <h3>
        <a href={item.url} target="_blank" rel="noreferrer noopener">
          {item.title}
        </a>
      </h3>
      <p>{item.summary}</p>
      <p className="muted">
        {KIND_LABEL[item.kind] ?? item.kind} · {item.publisher} ·{" "}
        {LANGUAGE_LABEL[item.language] ?? item.language} · licença{" "}
        {item.license.url ? (
          <a href={item.license.url} target="_blank" rel="noreferrer noopener">
            {item.license.label}
          </a>
        ) : (
          item.license.label
        )}
      </p>
    </li>
  );
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const onboarding = await getOnboarding();
  if (!onboarding?.complete) redirect("/onboarding");

  const { node } = await searchParams;
  const [library, roadmap] = await Promise.all([getLibrary(node), getRoadmap()]);
  const goal = onboarding.goal;
  const goals = (onboarding.goals ?? []).map((item) => ({
    id: item.id,
    statement: item.statement,
    isCurrent: Boolean(item.isCurrent),
    primaryTarget: item.primaryTarget,
    curriculumStatus: item.curriculumStatus,
  }));

  const mapNodes = [...(roadmap?.nodes ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  const byNode = new Map<string, LibraryItem[]>();
  for (const item of library?.items ?? []) {
    for (const linked of item.nodes) {
      const list = byNode.get(linked.slug) ?? [];
      if (!list.some((x) => x.slug === item.slug)) list.push(item);
      byNode.set(linked.slug, list);
    }
  }

  const orphanItems =
    library?.items.filter((item) => item.nodes.length === 0) ?? [];

  return (
    <section className="stack library-page">
      <h1>Biblioteca do objectivo</h1>
      <p className="muted">
        {library?.policy ??
          "Só recursos do mapa activo. Outros objectivos não misturam aqui."}
      </p>

      <GoalSwitcher initialGoals={goals} />

      {library?.goal?.available && library.goal.statement ? (
        <GoalBanner
          statement={library.goal.statement}
          targetSlug={library.goal.primaryTarget?.slug}
          targetLabel={library.goal.primaryTarget?.label}
          eyebrow="Biblioteca deste objectivo"
          compact
        />
      ) : null}

      {library?.filterNode ? (
        <p className="nav">
          <span className="muted">Etapa: {library.filterNode.title}</span>{" "}
          <Link className="btn btn-ghost" href="/biblioteca">
            Ver sequência completa
          </Link>
        </p>
      ) : null}

      {!library ? (
        <p className="alert alert-error" role="status">
          Não foi possível ler a biblioteca.
        </p>
      ) : library.items.length === 0 ? (
        <div className="stack">
          <p role="status">
            {library.message ??
              (node
                ? "Ainda não há recurso para esta etapa deste objectivo."
                : "Ainda sem documentos neste objectivo. Quando o mapa gera, a pesquisa associa Wikipedia e fontes aos nós.")}
          </p>
          <p className="nav">
            <Link className="btn btn-primary" href="/mapa">
              Abrir mapa / regenerar
            </Link>
            <Link className="btn btn-ghost" href="/onboarding">
              Novo objectivo
            </Link>
          </p>
        </div>
      ) : node || mapNodes.length === 0 ? (
        <ul className="node-list">
          {library.items.map((item) => (
            <ResourceCard key={item.slug} item={item} />
          ))}
        </ul>
      ) : (
        <div className="library-stages stack">
          <p className="muted">
            Materiais por etapa do programa (mesma sequência do mapa). Só este objectivo.
          </p>
          {mapNodes.map((mapNode, index) => {
            const stage =
              STUDY_PROGRAM_STAGES.find((s) => mapNode.slug.includes(s.key)) ??
              STUDY_PROGRAM_STAGES[index];
            const items = byNode.get(mapNode.slug) ?? [];
            return (
              <section key={mapNode.slug} className="library-stage">
                <header className="library-stage__head">
                  <h2>
                    {stage ? `${index + 1}. ` : ""}
                    {mapNode.title}
                  </h2>
                  {stage ? <p className="muted">{stage.role}</p> : null}
                  <p className="nav">
                    <Link className="btn btn-ghost" href={`/estudar/${mapNode.slug}`}>
                      Estudar etapa
                    </Link>
                    <Link className="btn btn-ghost" href={`/biblioteca?node=${mapNode.slug}`}>
                      Só esta etapa
                    </Link>
                  </p>
                </header>
                {items.length === 0 ? (
                  <p className="muted">Sem documento ligado ainda — usa o texto/vídeo no mapa.</p>
                ) : (
                  <ul className="node-list">
                    {items.map((item) => (
                      <ResourceCard key={item.slug} item={item} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
          {orphanItems.length > 0 ? (
            <section className="library-stage">
              <h2>Outros deste objectivo</h2>
              <ul className="node-list">
                {orphanItems.map((item) => (
                  <ResourceCard key={item.slug} item={item} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      {!goal ? null : (
        <p className="nav">
          <Link className="btn btn-ghost" href="/mapa">
            Mapa deste objectivo
          </Link>
          <Link className="btn btn-ghost" href="/diagnostico">
            Diagnóstico de conteúdo
          </Link>
        </p>
      )}
    </section>
  );
}
