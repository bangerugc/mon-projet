// ─────────────────────────────────────────────────────────────────────────
// timing.ts — conversions ms ↔ frames + snapping. Fonctions PURES, zéro React.
//
// §6 : on stocke tout en ms entières et on convertit en frames au dernier
// moment avec Math.round — JAMAIS Math.floor (piège n°5 : décalage constant
// des sous-titres vers le bas).
// ─────────────────────────────────────────────────────────────────────────

/** Décalage de sync global autorisé (§5 / §6). */
export const OFFSET_MIN_MS = -500;
export const OFFSET_MAX_MS = 500;

/** Pas d'édition fin des timings dans le WordRail (§6). */
export const TIMING_STEP_MS = 10;

/**
 * Convertit des millisecondes en numéro de frame à `fps` donné.
 * `Math.round` (et non floor) pour ne pas décaler systématiquement vers le bas.
 * @example msToFrame(1000, 30) === 30
 * @example msToFrame(1016, 60) === 61
 */
export function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

/** Convertit un numéro de frame en millisecondes entières. */
export function frameToMs(frame: number, fps: number): number {
  return Math.round((frame / fps) * 1000);
}

/**
 * Aligne des millisecondes sur un pas (défaut 10 ms). Symétrique autour de 0
 * (les valeurs négatives s'arrondissent correctement, pas de biais).
 */
export function snapMs(ms: number, step: number = TIMING_STEP_MS): number {
  if (step <= 0) return ms;
  return Math.round(ms / step) * step;
}

/** Clampe le décalage global dans [OFFSET_MIN_MS, OFFSET_MAX_MS]. */
export function clampOffset(offsetMs: number): number {
  return Math.min(OFFSET_MAX_MS, Math.max(OFFSET_MIN_MS, offsetMs));
}
