import type { CaptionStyle, TemplateId } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// template-defaults.ts — DONNÉES des templates (labels + valeurs par défaut),
// sans aucun React. Séparé des composants Remotion (src/remotion/templates)
// pour que le store et les panneaux UI puissent l'importer sans tirer tout
// Remotion dans le bundle client. Le §8 est la source de ces valeurs.
// ─────────────────────────────────────────────────────────────────────────

export const TEMPLATE_META: Record<
  TemplateId,
  { label: string; defaults: Partial<CaptionStyle> }
> = {
  minimal: {
    label: "Minimal",
    defaults: { font: "poppins", animation: "fade", maxWordsPerLine: 4, strokeWidth: 0 },
  },
  karaoke: {
    label: "Karaoke",
    defaults: { font: "roboto", animation: "pop", maxWordsPerLine: 4, strokeWidth: 0 },
  },
  punch: {
    label: "Punch",
    defaults: {
      font: "komikaAxis",
      animation: "pop",
      maxWordsPerLine: 2,
      uppercase: true,
      strokeWidth: 8,
      strokeColor: "#000000",
    },
  },
  handwritten: {
    label: "Handwritten",
    defaults: { font: "bananaStick", animation: "rise", maxWordsPerLine: 3, strokeWidth: 0 },
  },
  editorial: {
    label: "Editorial",
    defaults: { font: "ttNormsSerif", animation: "blur", maxWordsPerLine: 5, strokeWidth: 0 },
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATE_META) as TemplateId[];

/** Applique les défauts d'un template à un style et fixe le template. */
export function applyTemplateDefaults(
  style: CaptionStyle,
  templateId: TemplateId,
): CaptionStyle {
  return { ...style, ...TEMPLATE_META[templateId].defaults, template: templateId };
}
