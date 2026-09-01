import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Entrar"
      subtitle="Usa o teu e-mail para retomar o mapa, a prática e o progresso."
    >
      <LoginForm />
    </AuthShell>
  );
}
