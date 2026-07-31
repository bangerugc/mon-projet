import type { Page, Route } from "@playwright/test";

/**
 * Collecte les erreurs console + pageerror pour les asserter (§11).
 * `ignore` : motifs d'erreurs attendues à ignorer (ex. 404 des polices tant
 * que les fichiers ne sont pas dans public/fonts/).
 */
export function trackConsoleErrors(page: Page, ignore: RegExp[] = []): string[] {
  const errors: string[] = [];
  const keep = (t: string) => !ignore.some((re) => re.test(t));
  page.on("console", (m) => {
    if (m.type() === "error" && keep(m.text())) errors.push(m.text());
  });
  page.on("pageerror", (e) => keep(e.message) && errors.push(e.message));
  return errors;
}

/** 404 attendus des polices (public/fonts/ vide tant que Shortfy ne les fournit pas). */
export const FONT_404 = /Failed to load resource.*404|\.(ttf|otf)/i;

/** Va jusqu'à l'éditeur : upload fixture → transcription démo → /editor. */
export async function openEditorWithVideo(page: Page): Promise<void> {
  await mockS3Upload(page);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/sample.webm");
  await page.getByTestId("go-editor").click();
  await page.getByTestId("word-rail").waitFor({ state: "visible" });
}

/**
 * Mocke l'upload S3 présigné + le PUT, pour éviter le 503 (AWS non configuré)
 * qui, sinon, apparaît comme une erreur réseau dans la console du navigateur.
 */
export async function mockS3Upload(page: Page): Promise<void> {
  await page.route("**/api/upload-url", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        uploadUrl: "https://mock-s3.test/put/object",
        key: "uploads/mock-key",
        publicUrl: "https://mock-s3.test/uploads/mock-key",
      }),
    }),
  );
  await page.route("https://mock-s3.test/**", (route: Route) =>
    route.fulfill({ status: 200, body: "" }),
  );
}
