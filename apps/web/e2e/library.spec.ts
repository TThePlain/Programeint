import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers";

test("biblioteca lista fontes oficiais com licença e filtra por nó", async ({ page }) => {
  await registerAndLogin(page, "Aluno Biblioteca");
  await page.getByLabel("O que queres aprender?").fill("Quero aprender Java para backend.");
  await page.getByRole("radio", { name: "Java", exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: "Iniciante" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Gravar objetivo" }).click();
  await expect(page).toHaveURL(/\/app/, { timeout: 20_000 });

  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Biblioteca" }).click();
  await expect(page).toHaveURL(/\/biblioteca/);
  await expect(page.getByRole("heading", { name: "Biblioteca", level: 1 })).toBeVisible();
  await expect(page.getByText(/nunca aloja o conteúdo/)).toBeVisible();

  // O link tem de apontar para o editor, com licença declarada ao lado.
  const proGit = page.getByRole("link", { name: "Pro Git" });
  await expect(proGit).toHaveAttribute("href", "https://git-scm.com/book/en/v2");
  await expect(page.getByRole("link", { name: "Creative Commons BY-NC-SA 3.0" }).first()).toBeVisible();

  await page.goto("/biblioteca?node=git");
  await expect(page.getByRole("link", { name: "Pro Git" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Documentação do PostgreSQL" })).toHaveCount(0);

  await page.getByRole("link", { name: "Ver todos os recursos" }).click();
  await expect(page).toHaveURL(/\/biblioteca$/);
  await expect(page.getByRole("link", { name: "Documentação do PostgreSQL" })).toBeVisible();
});
