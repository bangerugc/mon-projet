import { test, expect } from "@playwright/test";
import { trackConsoleErrors, FONT_404, openEditorWithVideo } from "./helpers";

test("l'éditeur charge avec les mots et le player", async ({ page }) => {
  const errors = trackConsoleErrors(page, [FONT_404]);
  await openEditorWithVideo(page);

  await expect(page.getByTestId("word-rail")).toBeVisible();
  await expect(page.getByTestId("drag-overlay")).toBeVisible();
  // 14 mots de la transcription démo.
  await expect(page.getByTestId("word-demo-1")).toBeVisible();
  await expect(page.getByTestId("word-demo-14")).toBeVisible();

  expect(errors).toEqual([]);
});

test("supprimer un mot puis annuler (undo) le restaure", async ({ page }) => {
  const errors = trackConsoleErrors(page, [FONT_404]);
  await openEditorWithVideo(page);

  // Sélectionner le 1er mot → l'éditeur de mot apparaît.
  await page.getByTestId("word-demo-1").click();
  await expect(page.getByTestId("word-editor")).toBeVisible();

  // Supprimer → le mot disparaît du rail.
  await page.getByTestId("word-delete").click();
  await expect(page.getByTestId("word-demo-1")).toHaveCount(0);

  // Undo → il revient.
  await page.getByTestId("undo").click();
  await expect(page.getByTestId("word-demo-1")).toBeVisible();

  expect(errors).toEqual([]);
});

test("corriger le texte d'un mot se répercute dans le rail", async ({ page }) => {
  const errors = trackConsoleErrors(page, [FONT_404]);
  await openEditorWithVideo(page);

  await page.getByTestId("word-demo-1").click();
  const input = page.getByTestId("word-text-input");
  await input.fill("Salut");
  await input.blur();

  await expect(page.getByTestId("word-demo-1")).toContainText("Salut");
  expect(errors).toEqual([]);
});

test("changer de template met à jour la sélection", async ({ page }) => {
  const errors = trackConsoleErrors(page, [FONT_404]);
  await openEditorWithVideo(page);

  // Mobile : ouvrir le bottom sheet ; desktop : le panneau est déjà visible.
  const trigger = page.getByTestId("open-style");
  if (await trigger.isVisible()) await trigger.click();

  const punch = page.locator('[data-testid="template-punch"]:visible');
  await punch.click();
  await expect(punch).toHaveAttribute("data-active", "true");

  expect(errors).toEqual([]);
});
