import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers";

test("GitHub sem OAuth fica BLOCKED e não inventa ligação", async ({ page }) => {
  test.setTimeout(90_000);
  await registerAndLogin(page, "Aluno GitHub");
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

  await page.goto("/portfolio");
  await expect(page.getByRole("heading", { name: "GitHub" })).toBeVisible();
  await expect(
    page.locator("article").filter({ has: page.getByRole("heading", { name: "GitHub" }) }).getByText(/GITHUB_CLIENT_ID/),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Ligar GitHub" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Desligar GitHub" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publicar evidência no GitHub" })).toHaveCount(0);
});
