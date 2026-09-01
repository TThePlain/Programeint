import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Se o e-mail existir, enviamos um link. A resposta é a mesma caso não exista."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
