import { defineConfig, devices } from "@playwright/test";

const httpBaseURL = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: ".skill-evals/playwright/artifacts",
  reporter: [["list"], ["html", { outputFolder: ".skill-evals/playwright/report", open: "never" }]],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 5_000 },
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "zh-CN",
    timezoneId: "America/New_York"
  },
  webServer: {
    command: "node scripts/serve-test-fixtures.mjs",
    url: `${httpBaseURL}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 10_000
  },
  projects: [
    {
      name: "chromium-http",
      use: { ...devices["Desktop Chrome"], baseURL: httpBaseURL },
      testIgnore: /persistence-file\.spec\.mjs/
    },
    {
      name: "firefox-http",
      use: { ...devices["Desktop Firefox"], baseURL: httpBaseURL },
      testIgnore: [/persistence-file\.spec\.mjs/, /performance\.spec\.mjs/]
    },
    {
      name: "chromium-file",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /persistence-file\.spec\.mjs/
    },
    {
      name: "webkit-http",
      use: { ...devices["Desktop Safari"], baseURL: httpBaseURL },
      testMatch: /annotation-core\.spec\.mjs/
    }
  ]
});
