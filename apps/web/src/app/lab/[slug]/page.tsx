import { redirect } from "next/navigation";
import { LabClient } from "@/components/lab-client";
import { getOnboarding } from "@/lib/onboarding";
import { getSessionUser } from "@/lib/session";

export default async function LabPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const onboarding = await getOnboarding();
  if (!onboarding?.complete) redirect("/onboarding");
  const { slug } = await params;

  return <LabClient slug={slug} />;
}
