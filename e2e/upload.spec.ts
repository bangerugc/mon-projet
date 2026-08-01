import { test, expect } from "@playwright/test";
import { trackConsoleErrors, mockS3Upload, mockTranscribe } from "./helpers";

const FIXTURE = "e2e/fixtures/sample.webm";

test("la dropzone est visible à l'arrivée", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/");
  await expect(page.getByTestId("dropzone")).toBeVisible();
  expect(errors).toEqual([]);
});

test("fichier non supporté → message d'erreur clair, pas de crash", async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/");
  // PDF déguisé en .mp4 (§11 scénario 9).
  await page.locator('input[type="file"]').setInputFiles({
    name: "faux.mp4",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 pas une video"),
  });
  await expect(page.getByTestId("error")).toContainText("Format non supporté");
  await expect(page.getByTestId("preview")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("vidéo valide → preview + upload S3 (mocké) jusqu'à 'Envoyée'", async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  await mockS3Upload(page);
  await mockTranscribe(page);

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);

  // Preview instantanée (blob local).
  await expect(page.getByTestId("preview")).toBeVisible();
  await expect(page.locator("video")).toBeVisible();

  // Upload de fond mené jusqu'au bout.
  await expect(page.getByTestId("upload-status")).toContainText("Envoyée sur S3");

  // Bouton pour repartir sur une autre vidéo → retour à la dropzone.
  await page.getByTestId("reset").click();
  await expect(page.getByTestId("dropzone")).toBeVisible();

  expect(errors).toEqual([]);
});
