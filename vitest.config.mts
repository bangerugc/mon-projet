import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const rootDir = import.meta.dirname;

// Tests unitaires (Vitest). Les tests E2E vivent dans e2e/ et sont pilotés
// par Playwright — on les exclut explicitement pour éviter que Vitest ne les
// exécute (les deux utilisent `test`/`expect` mais des runners différents).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
  },
  resolve: {
    alias: {
      "@": resolve(rootDir, "src"),
    },
  },
});
