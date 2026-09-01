import Link from "next/link";
import { redirect } from "next/navigation";
import { StudyClient } from "@/components/study-client";
import { getOnboarding } from "@/lib/onboarding";
import { getModulePreview } from "@/lib/roadmap";
import { getSessionUser } from "@/lib/session";

export default async function StudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const onboarding = await getOnboarding();
  if (!onboarding?.complete) redirect("/onboarding");
  const { slug } = await params;
  const preview = await getModulePreview(slug);

  return (
    <section className="lesson-page">
      <p className="lesson-page__crumb">
        <Link href="/mapa">← Mapa</Link>
        {" · "}
        <Link href="/biblioteca">Biblioteca</Link>
      </p>
      <StudyClient
        nodeSlug={slug}
        initialPreview={
          preview
            ? {
                title: preview.module.title,
                summary: preview.module.summary,
                body: preview.module.body,
                goalStatement: preview.goal.statement,
                primaryLabel: preview.goal.primaryLabel,
                resources: preview.resources,
              }
            : null
        }
      />
    </section>
  );
}
