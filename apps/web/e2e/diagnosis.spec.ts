import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers";

test("diagnóstico Java preenche o mapa com evidência", async ({ page }) => {
  await registerAndLogin(page, "Aluno Diag");
  await page.getByLabel("O que queres aprender?").fill("Quero aprender Java para backend.");
  await page.getByRole("radio", { name: "Java", exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: "Iniciante" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Gravar objetivo" }).click();
  await expect(page).toHaveURL(/\/app/, { timeout: 20_000 });

  await page.getByRole("link", { name: /diagnóstico/i }).click();
  await expect(page).toHaveURL(/diagnostico/);
  await expect(page.getByRole("heading", { name: "Diagnóstico" })).toBeVisible();

  for (let i = 0; i < 8; i += 1) {
    if (await page.getByText("Diagnóstico concluído").isVisible()) break;
    const responder = page.getByRole("button", { name: "Responder" });
    await expect(responder).toBeVisible({ timeout: 10_000 });
    await page.locator("label.choice").first().click();
    await expect(responder).toBeEnabled();
    await responder.click();
    await expect(page.getByRole("button", { name: "A gravar…" })).toHaveCount(0);
  }

  await expect(page.getByText("Diagnóstico concluído")).toBeVisible();
  await page.getByRole("link", { name: "Ver mapa" }).click();
  await expect(page).toHaveURL(/mapa/);
  await expect(page.getByRole("heading", { name: "Mapa de competências" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lógica de programação" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Spring Boot" })).toBeVisible();
});
