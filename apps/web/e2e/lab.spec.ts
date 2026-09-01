import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers";

test("lab Java corre testes na JVM isolada", async ({ page }) => {
  test.setTimeout(120_000);
  await registerAndLogin(page, "Aluno Lab");
  await page.getByLabel("O que queres aprender?").fill("Quero aprender Java para backend.");
  await page.getByRole("radio", { name: "Java", exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: "Iniciante" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Gravar objetivo" }).click();
  await expect(page).toHaveURL(/\/app/, { timeout: 20_000 });

  await page.getByRole("link", { name: /diagnóstico/i }).click();
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

  for (let i = 0; i < 4; i += 1) {
    await expect(page).toHaveURL(/\/app/);
    const lab = page.getByRole("link", { name: /Praticar .* no lab/ });
    const study = page.getByRole("link", { name: /^Estudar / });
    await expect(lab.or(study)).toBeVisible();
    if (await lab.isVisible()) {
      await lab.click();
      break;
    }
    await study.click();
    await page.getByRole("button", { name: "Concluí a leitura" }).click();
    await expect(page.getByRole("button", { name: "Verificar" })).toBeVisible();
    await page.locator("label.choice").first().click();
    await page.getByRole("button", { name: "Verificar" }).click();
    await expect(page.getByText("Módulo verificado")).toBeVisible();
    await page.getByRole("link", { name: "O que fazer agora" }).click();
  }

  await expect(page).toHaveURL(/\/lab\//);
  await expect(page.getByRole("heading", { name: "Laboratório" })).toBeVisible();

  if (page.url().includes("algo-twice")) {
    await page.locator("textarea.code-editor").fill(`public class Solution {
  public static int twice(int n) {
    return n * 2;
  }
}
`);
  } else if (page.url().includes("java-hello")) {
    await page.locator("textarea.code-editor").fill(`public class Main {
  public static void main(String[] args) {
    System.out.println("Olá, JVM");
  }
}
`);
  }

  await page.getByRole("button", { name: "Compilar e testar" }).click();
  await expect(
    page.getByText(/Testes passaram na JVM isolada|BLOCKED\/CONFIGURATION_REQUIRED|imagem .* em falta|Docker\/Lima/),
  ).toBeVisible({ timeout: 60_000 });
});
