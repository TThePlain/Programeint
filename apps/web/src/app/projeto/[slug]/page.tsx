import { redirect } from "next/navigation";
import { ProjectClient } from "@/components/project-client";
import { getOnboarding } from "@/lib/onboarding";
import { getSessionUser } from "@/lib/session";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const onboarding = await getOnboarding();
  if (!onboarding?.complete) redirect("/onboarding");
  const { slug } = await params;

  return (
    <section className="card wide stack">
      <h1>Projeto</h1>
      <ProjectClient slug={slug} />
    </section>
  );
}
