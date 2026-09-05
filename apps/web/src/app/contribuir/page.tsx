import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contribuir",
  description:
    "O Programeint é open source. Alunos e profissionais podem contribuir para melhorar a plataforma.",
};

export default function ContribuirPage() {
  return (
    <section className="contribute-page">
      <header className="contribute-page__intro">
        <p className="contribute-page__eyebrow">Código aberto</p>
        <h1 className="contribute-page__h1">Ajuda a melhorar o Programeint</h1>
        <p className="muted contribute-page__lede">
          Esta plataforma é open source — para aprender <strong>qualquer linguagem ou stack</strong>,
          com plano, ferramentas e prática alinhados ao objectivo. Podes reportar bugs, melhorar
          docs, acrescentar labs noutras runtimes ou evoluir a UI.
        </p>
      </header>

      <div className="contribute-page__grid">
        <article className="contribute-page__panel">
          <h2>Para quem é</h2>
          <p className="muted">
            Alunos a aprender programação e profissionais que queiram contribuir com código,
            conteúdo ou revisão.
          </p>
        </article>
        <article className="contribute-page__panel">
          <h2>O que valorizamos</h2>
          <p className="muted">
            Software real — sem ecrãs falsos. Integrações sem chave ficam{" "}
            <code>CONFIGURATION_REQUIRED</code>. Mudanças pequenas e honestas.
          </p>
        </article>
        <article className="contribute-page__panel">
          <h2>Como começar</h2>
          <ol className="contribute-page__steps">
            <li>Clona o repositório e lê <code>CONTRIBUTING.md</code></li>
            <li>
              Sobe a infra: <code>docker compose -f docker-compose.yml up -d</code>
            </li>
            <li>
              Corre <code>pnpm install</code>, migrações e <code>pnpm dev</code>
            </li>
            <li>Abre um PR com um tema só — UI, docs, lab ou teste</li>
          </ol>
        </article>
      </div>

      <p className="contribute-page__cta nav">
        <Link className="btn btn-primary" href="/criar-conta">
          Criar conta e experimentar
        </Link>
        <Link className="btn btn-ghost" href="/">
          Voltar ao início
        </Link>
      </p>

      <p className="muted contribute-page__license">
        Licença MIT · Código de conduta e política de segurança no repositório.
      </p>
    </section>
  );
}
