import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers";

test("depois do diagnóstico estuda o nó recomendado", async ({ page }) => {
  await registerAndLogin(page, "Aluno Estudo");
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
  await page.getByRole("link", { name: "O que fazer agora" }).click();
  await expect(page).toHaveURL(/\/app/);
  const studyCta = page.getByRole("link", { name: /^Estudar / });
  await expect(studyCta).toBeVisible();
  await studyCta.click();
  await expect(page).toHaveURL(/estudar\//);
  await expect(page.getByRole("button", { name: "Concluí a leitura" })).toBeVisible();

  await page.getByRole("button", { name: "Concluí a leitura" }).click();
  await expect(page.getByRole("button", { name: "Verificar" })).toBeVisible();
  await page.locator("label.choice").first().click();
  await page.getByRole("button", { name: "Verificar" }).click();
  await expect(page.getByText("Módulo verificado")).toBeVisible();

  await page.getByRole("link", { name: "O que fazer agora" }).click();
  await expect(page).toHaveURL(/\/app/);
  await expect(page.getByRole("link", { name: /^(Estudar |Praticar |Abrir projeto )/ })).toBeVisible();

  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Mapa" }).click();
  await expect(page.getByText("Módulo verificado")).toBeVisible();
});
