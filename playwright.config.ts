import { defineConfig, devices } from "@playwright/test";

// E2E Chrome : desktop + émulation iPhone 14 (mobile = priorité n°1, §1).
// Playwright démarre l'app en `next dev` puis attend qu'elle réponde.
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // §1 : les E2E tournent sur Chrome, y compris le mobile. Le descriptor
      // "iPhone 14" bascule par défaut sur WebKit → on force Chromium tout en
      // gardant le viewport / user-agent / isMobile de l'iPhone 14.
      name: "mobile-iphone-14",
      use: { ...devices["iPhone 14"], browserName: "chromium" },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
