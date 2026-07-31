import type { CSSProperties } from "react";
import type { CaptionStyle } from "@/lib/types";
import { fontFamilyOf } from "../fonts";

// Helpers partagés par les templates. Garder ici tout ce qui est commun pour
// qu'un 6e template = un fichier + une ligne dans le registry (§8).

/** Taille de police en px = % de la largeur vidéo (responsive, §5). */
export function fontPx(fontSizePercent: number, videoWidth: number): number {
  return (fontSizePercent / 100) * videoWidth;
}

export function applyCase(text: string, uppercase: boolean): string {
  return uppercase ? text.toUpperCase() : text;
}

/** Contour de texte (0 = aucun). Épaisseur relative à la taille de police. */
export function strokeStyle(style: CaptionStyle, fontSizePx: number): CSSProperties {
  if (style.strokeWidth <= 0) return {};
  return {
    WebkitTextStrokeWidth: `${(style.strokeWidth / 100) * fontSizePx}px`,
    WebkitTextStrokeColor: style.strokeColor,
    paintOrder: "stroke fill",
  };
}

/** Style de base commun (police, taille, casse via CSS). */
export function baseTextStyle(
  style: CaptionStyle,
  fontSizePx: number,
): CSSProperties {
  return {
    fontFamily: fontFamilyOf(style.font),
    fontSize: `${fontSizePx}px`,
    lineHeight: 1.2,
    color: style.color,
    textTransform: style.uppercase ? "uppercase" : "none",
    textAlign: "center",
  };
}
