import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import type { FontId } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// fonts.ts — les 7 polices (§9). Chargées depuis public/fonts/ via
// staticFile() (inclus dans le bundle Lambda) — JAMAIS depuis un CDN (CORS /
// cold start = police manquante à l'export, sans erreur visible).
//
// ⚠️ Les 7 fichiers doivent être déposés dans public/fonts/ (voir le README de
// ce dossier). Tant qu'ils manquent, le chargement échoue en silence et on
// retombe sur une police système : l'app reste fonctionnelle (pas de crash).
// ─────────────────────────────────────────────────────────────────────────

export const FONTS: Record<FontId, { family: string; file: string }> = {
  poppins: { family: "Poppins", file: "Poppins.ttf" },
  roboto: { family: "Roboto", file: "Roboto.ttf" },
  helvChildren: { family: "HelvChildren", file: "HelvChildren.otf" },
  mochica: { family: "Mochica", file: "MochicaPERSONALUSE.otf" },
  ttNormsSerif: { family: "TTNormsProSerif", file: "TTNormsProSerifTrl.ttf" },
  bananaStick: { family: "BananaStick", file: "BananaStick.otf" },
  komikaAxis: { family: "KomikaAxis", file: "KomikaAxis.ttf" },
};

/** Vrai si le fichier est réellement servi (évite le cancelRender de loadFont). */
async function fontFileExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Charge les polices RÉELLEMENT présentes dans public/fonts/. On vérifie
 * l'existence AVANT `loadFont` car `loadFont` appelle `cancelRender()` en
 * interne sur un fichier manquant → ça tuerait tout le render. Polices
 * absentes = fallback système, jamais de crash. À appeler sous delayRender (§9).
 */
export async function loadAllFonts(): Promise<void> {
  await Promise.allSettled(
    Object.values(FONTS).map(async (f) => {
      const url = staticFile(`fonts/${f.file}`);
      if (await fontFileExists(url)) {
        await loadFont({ family: f.family, url });
      }
    }),
  );
}

/** Famille CSS pour une police, avec fallback système. */
export function fontFamilyOf(font: FontId): string {
  return `'${FONTS[font].family}', system-ui, sans-serif`;
}
