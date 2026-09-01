import { expect, test } from "@playwright/test";
import { waitForMailToken } from "./helpers";

test("recuperação de senha: e-mail → redefinir → entrar", async ({ page }) => {
  const email = `reset.${Date.now()}.${Math.random().toString(16).slice(2)}@programeint.test`;
  const password = "senha-segura-1";
  const nextPassword = "senha-nova-99";

  await page.goto("/criar-conta");
  await page.getByLabel("Nome").fill("Aluno Reset");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  const verify = await waitForMailToken(email, "verificar-email");
  await page.goto(`/verificar-email?token=${encodeURIComponent(verify)}&email=${encodeURIComponent(email)}`);
  await page.getByRole("button", { name: "Confirmar e-mail" }).click();

  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(page.getByText(/Se existir uma conta/)).toBeVisible({ timeout: 10_000 });

  const resetToken = await waitForMailToken(email, "redefinir-senha");
  await page.goto(`/redefinir-senha?token=${encodeURIComponent(resetToken)}`);
  await page.getByLabel("Nova senha").fill(nextPassword);
  await page.getByRole("button", { name: "Guardar senha" }).click();
  await expect(page.getByText(/Senha atualizada/i)).toBeVisible({ timeout: 10_000 });

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText(/incorrectos|incorretos|incorrecta/i)).toBeVisible({ timeout: 10_000 });

  await page.getByLabel("Senha").fill(nextPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/onboarding|\/app/, { timeout: 15_000 });
});
