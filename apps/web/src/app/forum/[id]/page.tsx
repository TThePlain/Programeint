import { redirect } from "next/navigation";
import { ForumPostClient } from "@/components/forum-post-client";
import { getSessionUser } from "@/lib/session";

type Props = { params: Promise<{ id: string }> };

export default async function ForumPostPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  const { id } = await params;
  return <ForumPostClient postId={id} />;
}
