import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers";

test("conta: exportar dados e apagar conta", async ({ page }) => {
  test.setTimeout(90_000);
  const { password } = await registerAndLogin(page, "Aluno Conta");
  await expect(page).toHaveURL(/onboarding/);

  const onboard = await page.request.put("/api/onboarding", {
    data: {
      statement: "Quero aprender Java para backend.",
      primaryTarget: "java",
      experienceLevel: "beginner",
      knownTopics: [],
      weeklyHours: 3,
      sessionMinutes: 45,
      prefersVideo: true,
      prefersReading: true,
      prefersPractice: true,
    },
  });
  expect(onboard.ok()).toBeTruthy();

  await page.goto("/conta");
  await expect(page.getByRole("heading", { name: "Conta", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Gerar exportação" }).click();
  await expect(page.getByText(/Exportação gerada/)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("pre.code-block")).toContainText("exportedAt");

  await page.getByLabel("Senha actual").fill(password);
  await page.getByPlaceholder("APAGAR").fill("APAGAR");
  await page.getByRole("button", { name: "Apagar conta permanentemente" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
});
