import { AuthShell } from "@/components/auth-shell";
import { VerifyEmailForm } from "@/components/verify-email-form";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell
      title="Confirmar e-mail"
      subtitle="Em desenvolvimento local, o link chega ao Mailpit (http://127.0.0.1:8025)."
    >
      <VerifyEmailForm initialToken={params.token ?? ""} email={params.email ?? ""} />
    </AuthShell>
  );
}
