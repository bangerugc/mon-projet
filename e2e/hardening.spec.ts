import { test, expect } from "@playwright/test";
import {
  trackConsoleErrors,
  FONT_404,
  mockS3Upload,
  openEditorWithVideo,
} from "./helpers";

const FIXTURE = "e2e/fixtures/sample.webm";

// §11 #7 — aucun scroll horizontal parasite (le bug mobile corrigé en Phase 5).
test("éditeur : aucun débordement horizontal", async ({ page }) => {
  const errors = trackConsoleErrors(page, [FONT_404]);
  await openEditorWithVideo(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1); // tolérance arrondi
  expect(errors).toEqual([]);
});

// L'éditeur desktop tient dans l'écran (page non scrollable, vidéo plafonnée).
test("éditeur desktop : pas de scroll vertical de page", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desktop", "desktop uniquement");
  const errors = trackConsoleErrors(page, [FONT_404]);
  await openEditorWithVideo(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollHeight - document.documentElement.clientHeight,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

// §11 #5 — drag vertical des sous-titres, snap au centre (Pointer Events).
test("drag des sous-titres vers le centre → snap à 0.50", async ({ page }) => {
  const errors = trackConsoleErrors(page, [FONT_404]);
  await openEditorWithVideo(page);

  const overlay = page.getByTestId("drag-overlay");
  const box = await overlay.boundingBox();
  if (!box) throw new Error("overlay introuvable");
  const cx = box.x + box.width / 2;

  await page.mouse.move(cx, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(cx, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();

  await expect(overlay).toHaveAttribute("data-position-y", "0.50");
  expect(errors).toEqual([]);
});

// §11 #10 — vidéo sans parole → message explicite, pas de passage à l'éditeur.
test("vidéo sans audio (0 mot) → message explicite", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await mockS3Upload(page);
  await page.route("**/api/transcribe", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ words: [], demo: false, empty: true }),
    }),
  );
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);

  await expect(page.getByTestId("transcript")).toContainText("Aucune parole détectée");
  await expect(page.getByTestId("go-editor")).toHaveCount(0);
  expect(errors).toEqual([]);
});

// §11 #4 — un réglage de style est bien pris en compte.
test("basculer les majuscules est pris en compte", async ({ page }) => {
  const errors = trackConsoleErrors(page, [FONT_404]);
  await openEditorWithVideo(page);

  const trigger = page.getByTestId("open-style");
  if (await trigger.isVisible()) await trigger.click();

  const toggle = page.locator('[data-testid="toggle-uppercase"]:visible');
  const before = await toggle.getAttribute("data-active");
  await toggle.click();
  const after = await toggle.getAttribute("data-active");
  expect(after).not.toBe(before); // l'état a bien basculé
  expect(errors).toEqual([]);
});
