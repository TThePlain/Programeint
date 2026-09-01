import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers";

// Só corre onde existe um provider de IA configurado (AI_API_KEY na API).
// Nesta máquina o tutor está BLOCKED, por isso este teste é saltado em vez de fingir que passou.
test("tutor com provider configurado responde e grava a conversa", async ({ page, request }) => {
  const status = await request.get("http://127.0.0.1:4000/api/tutor/status");
  const body = await status.json();
  test.skip(!body.configured, "AI_API_KEY não configurada: tutor BLOCKED nesta máquina.");

  await registerAndLogin(page, "Aluno Tutor IA");
  await page.getByLabel("O que queres aprender?").fill("Quero aprender Java para backend.");
  await page.getByRole("radio", { name: "Java", exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: "Iniciante" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Gravar objetivo" }).click();
  await expect(page).toHaveURL(/\/app/, { timeout: 20_000 });

  await page.goto("/tutor/algorithms");
  await expect(page.getByText("Ainda não perguntaste nada sobre Algoritmos.")).toBeVisible();

  await page.getByLabel(/Pergunta sobre Algoritmos/).fill("Onde é que o meu raciocínio falha?");
  await page.getByRole("button", { name: "Perguntar ao tutor" }).click();

  const thread = page.locator(".tutor-turn");
  await expect(thread).toHaveCount(2, { timeout: 30_000 });
  await expect(thread.nth(0)).toContainText("Onde é que o meu raciocínio falha?");
  await expect(thread.nth(1)).toContainText(/\S/);

  // A conversa tem de sobreviver a um reload: nada é só estado do browser.
  await page.reload();
  await expect(page.locator(".tutor-turn")).toHaveCount(2);
});
