import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers";

test("tutor sem AI_API_KEY fica BLOCKED e não abre caixa de perguntas", async ({ page }) => {
  await registerAndLogin(page, "Aluno Tutor");
  await page.getByLabel("O que queres aprender?").fill("Quero aprender Java para backend.");
  await page.getByRole("radio", { name: "Java", exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: "Iniciante" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Gravar objetivo" }).click();
  await expect(page).toHaveURL(/\/app/, { timeout: 20_000 });

  await page.goto("/tutor/algorithms");
  await expect(page.getByRole("heading", { name: /Tutor · Algoritmos/ })).toBeVisible();
  await expect(page.getByText("BLOCKED/CONFIGURATION_REQUIRED")).toBeVisible();
  await expect(page.getByText(/AI_API_KEY/).first()).toBeVisible();

  // Sem chave não pode existir caixa nem botão que finjam funcionar.
  await expect(page.getByRole("button", { name: "Perguntar ao tutor" })).toHaveCount(0);
  await expect(page.locator("textarea")).toHaveCount(0);

  await page.getByRole("link", { name: "Voltar ao módulo" }).click();
  await expect(page).toHaveURL(/\/estudar\/algorithms/);
  await expect(page.getByRole("link", { name: "Perguntar ao tutor" })).toBeVisible();
});
