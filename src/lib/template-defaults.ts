import type { CaptionStyle, TemplateId } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// template-defaults.ts — DONNÉES des 5 presets (labels + valeurs par défaut),
// sans React. Reproduit les styles connus : LEON, HORMOZI 2, Ali, HORMOZI 3,
// LUKE. Séparé des composants Remotion pour un bundle client léger.
// ─────────────────────────────────────────────────────────────────────────

export const TEMPLATE_META: Record<
  TemplateId,
  { label: string; defaults: Partial<CaptionStyle> }
> = {
  leon: {
    label: "Leon",
    defaults: {
      font: "komikaAxis",
      animation: "pop",
      maxWordsPerLine: 3,
      uppercase: true,
      color: "#ffffff",
      highlightColor: "#f5511e",
      strokeWidth: 10,
      strokeColor: "#000000",
    },
  },
  hormozi2: {
    label: "Hormozi 2",
    defaults: {
      font: "poppins",
      animation: "pop",
      maxWordsPerLine: 3,
      uppercase: true,
      color: "#ffffff",
      highlightColor: "#22c55e",
      strokeWidth: 12,
      strokeColor: "#000000",
    },
  },
  ali: {
    label: "Ali",
    defaults: {
      font: "poppins",
      animation: "fade",
      maxWordsPerLine: 4,
      uppercase: false,
      color: "#111114",
      highlightColor: "#4f46e5",
      strokeWidth: 0,
    },
  },
  hormozi3: {
    label: "Hormozi 3",
    defaults: {
      font: "poppins",
      animation: "pop",
      maxWordsPerLine: 3,
      uppercase: true,
      color: "#ffffff",
      highlightColor: "#ffd400",
      strokeWidth: 8,
      strokeColor: "#000000",
    },
  },
  luke: {
    label: "Luke",
    defaults: {
      font: "poppins",
      animation: "fade",
      maxWordsPerLine: 4,
      uppercase: true,
      color: "#e8dfd0",
      highlightColor: "#ffffff",
      strokeWidth: 0,
    },
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
