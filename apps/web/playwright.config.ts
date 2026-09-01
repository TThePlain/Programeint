import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @programeint/api dev",
      url: "http://127.0.0.1:4000/api/health",
      reuseExistingServer: true,
      cwd: "../../",
    },
    {
      command: "pnpm --filter @programeint/web dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      cwd: "../../",
    },
  ],
});
