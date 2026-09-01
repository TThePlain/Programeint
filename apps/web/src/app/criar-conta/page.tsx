import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Criar conta"
      subtitle="E-mail verdadeiro — enviamos um link de confirmação para começares."
    >
      <RegisterForm />
    </AuthShell>
  );
}
