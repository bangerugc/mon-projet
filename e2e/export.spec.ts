import { test, expect } from "@playwright/test";
import { trackConsoleErrors, FONT_404, openEditorWithVideo } from "./helpers";

// Sans AWS, /api/render tourne en mock : progression simulée puis lien de
// téléchargement. Parcours complet testable sans credentials ni coût.
test("export mocké : lancer → progression → lien de téléchargement", async ({
  page,
}) => {
  const errors = trackConsoleErrors(page, [FONT_404]);
  await openEditorWithVideo(page);

  await page.getByTestId("export-open").click();
  await page.getByTestId("export-start").click();

  // La progression s'affiche…
  await expect(page.getByTestId("export-progress")).toBeVisible();

  // …puis le rendu (mock ~1,5 s) se termine → lien de téléchargement.
  await expect(page.getByTestId("export-download")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("export-download")).toHaveAttribute("download", "");

  expect(errors).toEqual([]);
});
