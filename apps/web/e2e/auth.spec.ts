import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers";

test("cadastro, verificação de e-mail, login e logout", async ({ page }) => {
  await registerAndLogin(page, "Aluno E2E");
  await expect(page).toHaveURL(/onboarding/);
  await expect(page.getByRole("heading", { name: "Define o teu objetivo" })).toBeVisible();

  await page.locator("header.top").getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });

  await page.goto("/app");
  await expect(page).toHaveURL(/entrar/);
});
