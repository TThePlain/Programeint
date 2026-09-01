import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers";

test("grava objetivo e mostra-o no estudo", async ({ page }) => {
  await registerAndLogin(page, "Aluno Objetivo");
  await expect(page).toHaveURL(/onboarding/);

  await page.getByLabel("O que queres aprender?").fill("Quero aprender Java para backend.");
  await page.getByRole("radio", { name: "Java", exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("radio", { name: "Iniciante" }).check();
  await page.getByRole("checkbox", { name: "Git / GitHub" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("Horas por semana").fill("6");
  await page.getByRole("radio", { name: "45 min" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: "Gravar objetivo" }).click();
  await expect(page).toHaveURL(/\/app/, { timeout: 20_000 });
  await expect(page.getByText("Quero aprender Java para backend.")).toBeVisible();
  await expect(page.getByText(/Alvo principal:\s*Java/)).toBeVisible();
  await expect(page.getByText(/6 h\/semana/)).toBeVisible();
});
