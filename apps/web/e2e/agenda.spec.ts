import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers";

test("agenda cria sessão, planeia semana e conclui com foco", async ({ page }) => {
  test.setTimeout(90_000);
  await registerAndLogin(page, "Aluno Agenda");
  await expect(page).toHaveURL(/onboarding/);

  // Onboarding via API (contrato real) — o UI do wizard tem E2E próprio.
  // Evita corrida com Fast Refresh no arranque dos webServers do Playwright.
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

  await page.goto("/agenda");
  await expect(page.getByRole("heading", { name: "Agenda", level: 1 })).toBeVisible();
  await expect(page.getByText(/Eventos são persistidos/)).toBeVisible();
  await expect(page.getByText(/3 h\/semana/)).toBeVisible();

  await page.getByLabel("Título").fill("Sessão E2E de estudo");
  await page.getByRole("button", { name: "Agendar" }).click();
  await expect(page.getByText("Sessão agendada.")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("heading", { name: /Sessão E2E de estudo/ })).toBeVisible();

  await page.getByRole("button", { name: "Planear semana" }).click();
  await expect(page.getByText(/Foram agendadas|Já existem sessões/)).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Iniciar foco" }).first().click();
  await expect(page.getByRole("heading", { name: "Foco (Pomodoro opcional)" })).toBeVisible();
  await page.waitForTimeout(1100);
  await page.getByRole("button", { name: "Concluir e gravar foco" }).click();
  await expect(page.getByText(/Sessão concluída/)).toBeVisible({ timeout: 10_000 });
});
