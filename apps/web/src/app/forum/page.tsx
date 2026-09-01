import { redirect } from "next/navigation";
import { ForumClient } from "@/components/forum-client";
import { getSessionUser } from "@/lib/session";

export default async function ForumPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");

  return <ForumClient />;
}
