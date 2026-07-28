import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, BACKEND_URL, IS_LOCAL } from "./env.js";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Only auto-starts local dev servers when targeting localhost (the usual
  // dev workflow, reusing them if already running). Point E2E_BASE_URL at a
  // deployed test server instead and this is skipped entirely.
  webServer: IS_LOCAL
    ? [
        {
          command: "npm run dev",
          cwd: "../backend",
          port: Number(new URL(BACKEND_URL).port),
          reuseExistingServer: true,
          timeout: 30_000,
        },
        {
          command: "npm run dev",
          cwd: "../frontend",
          port: Number(new URL(BASE_URL).port),
          reuseExistingServer: true,
          timeout: 30_000,
        },
      ]
    : undefined,
});
