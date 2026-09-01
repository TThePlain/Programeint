import Link from "next/link";
import { redirect } from "next/navigation";
import { getGithubStatus } from "@/lib/github";
import { getOnboarding } from "@/lib/onboarding";
import { getPortfolio, getProjectList } from "@/lib/projects";
import { getSessionUser } from "@/lib/session";
import { GithubDisconnectButton } from "@/components/github-disconnect-button";
import { GithubPublishButton } from "@/components/github-publish-button";

export default async function PortfolioPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const onboarding = await getOnboarding();
  if (!onboarding?.complete) redirect("/onboarding");

  const [evidence, projects, github] = await Promise.all([
    getPortfolio(),
    getProjectList(),
    getGithubStatus(),
  ]);

  const hasEvidence = Boolean(evidence?.items.length);

  return (
    <section className="stack">
      <h1>Portfólio</h1>
      <p className="muted">
        Só entra evidência de testes isolados que passaram. Publicar no GitHub cria/actualiza um
        repositório público com um Markdown — continua a não ser certificado.
      </p>

      <article className="card wide stack">
        <h2>Evidência</h2>
        {hasEvidence ? (
          <ul className="node-list">
            {evidence!.items.map((item) => (
              <li key={item.projectSlug} className="node-item">
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <p className="muted">
                  {new Date(item.passedAt).toLocaleString("pt-PT")} ·{" "}
                  <Link href={item.href}>Abrir projeto</Link>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p role="status">
            Ainda não há evidência de projeto. Passar um lab de um único método não conta como
            projeto.
          </p>
        )}
      </article>

      <article className="card wide stack">
        <h2>GitHub</h2>
        {github?.errorCode === "BLOCKED/CONFIGURATION_REQUIRED" ? (
          <p className="alert alert-error" role="status">
            {github.message}
          </p>
        ) : github?.connected ? (
          <>
            <p>{github.message}</p>
            <GithubPublishButton disabled={!hasEvidence} />
            {!hasEvidence ? (
              <p className="muted">O botão activa-se quando existir evidência de projecto.</p>
            ) : null}
            <GithubDisconnectButton />
          </>
        ) : github?.configured ? (
          <p>
            <a className="btn btn-primary" href="/api/github/connect">
              Ligar GitHub
            </a>
          </p>
        ) : (
          <p className="muted">Estado GitHub indisponível.</p>
        )}
      </article>

      <article className="card wide stack">
        <h2>Projetos publicados</h2>
        {projects?.items.length ? (
          <ul className="node-list">
            {projects.items.map((item) => (
              <li key={item.slug} className="node-item">
                <h3>{item.title}</h3>
                {item.passed ? (
                  <p className="muted">
                    Evidência registada. <Link href={item.href}>Abrir projeto</Link>
                  </p>
                ) : item.locked ? (
                  <p className="muted">
                    Bloqueado — falta evidência em:{" "}
                    {item.missing.map((node) => node.title).join(", ")}.{" "}
                    <Link href={item.href}>Ver enunciado</Link>
                  </p>
                ) : (
                  <p>
                    <Link href={item.href}>Abrir {item.title}</Link>
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>Não há projetos publicados para este currículo.</p>
        )}
      </article>
    </section>
  );
}
