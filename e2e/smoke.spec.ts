import { test, expect } from "@playwright/test";

// Smoke E2E : l'app se charge sans erreur console, sur desktop ET mobile
// (les deux projets définis dans playwright.config.ts exécutent ce test).
test("la home se charge sans erreur console", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator("body")).toBeVisible();
  expect(errors, `erreurs console: ${errors.join(" | ")}`).toEqual([]);
});
