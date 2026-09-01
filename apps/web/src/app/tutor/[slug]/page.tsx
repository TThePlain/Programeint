import Link from "next/link";
import { redirect } from "next/navigation";
import { TutorClient } from "@/components/tutor-client";
import { getOnboarding } from "@/lib/onboarding";
import { getSessionUser } from "@/lib/session";
import { getTutorThread } from "@/lib/tutor";

export default async function TutorPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const onboarding = await getOnboarding();
  if (!onboarding?.complete) redirect("/onboarding");
  const { slug } = await params;
  const thread = await getTutorThread(slug);

  if (!thread) {
    return (
      <section className="card wide stack">
        <h1>Tutor</h1>
        <p className="alert alert-error" role="status">
          Não foi possível abrir o tutor para este nó.
        </p>
        <p>
          <Link className="btn btn-ghost" href="/mapa">
            Voltar ao mapa
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="card wide stack">
      <h1>Tutor · {thread.node.title}</h1>
      <TutorClient thread={thread} />
      <p className="nav">
        <Link className="btn btn-ghost" href={`/estudar/${thread.node.slug}`}>
          Voltar ao módulo
        </Link>
        <Link className="btn btn-ghost" href="/mapa">
          Mapa
        </Link>
      </p>
    </section>
  );
}
