// ─────────────────────────────────────────────────────────────────────────
// TYPES PARTAGÉS (§5) — tout le projet découle de ce fichier.
// Contrat unique Player ⇄ Lambda : ne jamais diverger.
//
// Règles :
//  - Jamais de secondes float dans le state. Millisecondes ENTIÈRES partout.
//    La conversion en frames se fait au dernier moment (voir lib/timing.ts).
//  - `fontSize` en % de la largeur → même rendu en 1080×1920 et 720×1280.
//  - `positionY` normalisé 0–1 → indépendant de la résolution.
// ─────────────────────────────────────────────────────────────────────────

/** Un mot transcrit. Timestamps en MILLISECONDES ENTIÈRES, jamais en secondes float. */
export type Word = {
  id: string; // nanoid, stable — sert de key React et de cible d'édition
  text: string;
  startMs: number;
  endMs: number;
  confidence: number | null;
};

export type TemplateId = "leon" | "hormozi2" | "ali" | "hormozi3" | "luke";

export type FontId =
  | "poppins"
  | "roboto"
  | "helvChildren"
  | "mochica"
  | "ttNormsSerif"
  | "bananaStick"
  | "komikaAxis";

export type AnimationId = "none" | "fade" | "pop" | "rise" | "blur";

export type CaptionStyle = {
  template: TemplateId;
  font: FontId;
  fontSize: number; // en % de la largeur de la vidéo (responsive par construction)
  color: string; // hex
  highlightColor: string; // hex — mot actif
  strokeWidth: number; // 0 = pas de contour
  strokeColor: string;
  uppercase: boolean;
  animation: AnimationId;
  maxWordsPerLine: number; // 1 à 6
  positionY: number; // 0 = haut, 1 = bas. Défaut 0.78
};

/** Plage de temps (ms) de la vidéo SOURCE à conserver (voir lib/segments.ts). */
export type Segment = { startMs: number; endMs: number };

/** Le contrat unique Player ⇄ Lambda. Ne jamais diverger. */
export type CaptionRenderProps = {
  videoSrc: string; // blob: en preview, https S3 au render
  words: Word[];
  style: CaptionStyle;
  offsetMs: number; // décalage global de sync (-500 → +500)
  /**
   * Segments de la vidéo source à garder (répétitions/retakes coupés). Les
   * `words` sont déjà remappés sur la timeline COMPRESSÉE correspondante.
   * Absent/vide → toute la vidéo (aucune coupure).
   */
  segments?: Segment[];
};

/**
 * Un groupe de mots affichés ensemble (une « ligne » de sous-titre), calculé
 * par `groupWordsIntoPages` (§8, lib/captions.ts). Les templates reçoivent une
 * `CaptionPage` + l'index du mot actif à l'intérieur.
 */
export type CaptionPage = {
  words: Word[];
  startMs: number; // = premier mot de la page
  endMs: number; // = dernier mot de la page
};
