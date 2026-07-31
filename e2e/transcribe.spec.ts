import { test, expect } from "@playwright/test";
import { trackConsoleErrors, mockS3Upload } from "./helpers";

const FIXTURE = "e2e/fixtures/sample.webm";

// Sans OPENAI_API_KEY, /api/transcribe répond en mode démo (14 mots fixes) :
// le parcours upload → transcription → affichage des mots est testable sans clé.
test("vidéo valide → transcription (démo) affichée avec les mots", async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  await mockS3Upload(page);

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);

  const transcript = page.getByTestId("transcript");
  await expect(transcript).toBeVisible();
  await expect(page.getByTestId("transcript-status")).toContainText(
    "14 mots transcrits",
  );
  await expect(transcript).toContainText("démo");
  await expect(transcript).toContainText("Ceci"); // 1er mot de la démo

  expect(errors).toEqual([]);
});
