import { test, expect } from "@playwright/test";
import { trackConsoleErrors, FONT_404, openEditorWithVideo } from "./helpers";

test("l'éditeur charge avec le player et la scène", async ({ page }) => {
  const errors = trackConsoleErrors(page, [FONT_404]);
  await openEditorWithVideo(page);

  await expect(page.getByTestId("play-toggle")).toBeVisible();
  await expect(page.getByTestId("drag-overlay")).toBeVisible();

  expect(errors).toEqual([]);
});

test("changer de template met à jour la sélection", async ({ page }) => {
  const errors = trackConsoleErrors(page, [FONT_404]);
  await openEditorWithVideo(page);

  // Mobile : ouvrir le bottom sheet ; desktop : le panneau est déjà visible.
  const trigger = page.getByTestId("open-style");
  if (await trigger.isVisible()) await trigger.click();

  const tpl = page.locator('[data-testid="template-ali"]:visible');
  await tpl.click();
  await expect(tpl).toHaveAttribute("data-active", "true");

  expect(errors).toEqual([]);
});
