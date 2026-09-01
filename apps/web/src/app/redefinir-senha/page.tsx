import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell title="Redefinir senha" subtitle="Escolhe uma senha nova e segura.">
      <ResetPasswordForm initialToken={params.token ?? ""} />
    </AuthShell>
  );
}
