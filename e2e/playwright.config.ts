import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Reuses the servers if they're already running (the usual dev workflow),
  // otherwise starts them so `npm test` also works standalone/in CI.
  webServer: [
    {
      command: "npm run dev",
      cwd: "../backend",
      port: 4000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "npm run dev",
      cwd: "../frontend",
      port: 3000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
