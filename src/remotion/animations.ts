import type { AnimationId } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// animations.ts — animations d'entrée des sous-titres. PURES (maths seules,
// zéro dépendance Remotion) → testables en unitaire. Chaque fonction renvoie
// de quoi styliser un élément à `localFrame` frames après son apparition.
// ─────────────────────────────────────────────────────────────────────────

export type AnimationValues = {
  opacity: number;
  transform: string;
  filter: string;
};

const NEUTRAL: AnimationValues = {
  opacity: 1,
  transform: "none",
  filter: "none",
};

/** Durée d'entrée ≈ 0,2 s, au moins 1 frame. */
function durationFrames(fps: number): number {
  return Math.max(1, Math.round(fps * 0.2));
}

/** Progression 0→1 clampée sur la durée d'entrée. */
function progress(localFrame: number, fps: number): number {
  const d = durationFrames(fps);
  if (localFrame <= 0) return 0;
  if (localFrame >= d) return 1;
  return localFrame / d;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

// easeOutBack : léger dépassement (effet "spring" pour pop).
const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/**
 * Valeurs d'animation d'entrée pour une `animation` donnée, `localFrame`
 * frames après l'apparition de l'élément. `localFrame < 0` = pas encore
 * apparu (opacité 0), sauf pour `none`.
 */
export function getEntranceAnimation(
  animation: AnimationId,
  localFrame: number,
  fps: number,
): AnimationValues {
  if (animation === "none") return NEUTRAL;
  if (localFrame < 0) return { opacity: 0, transform: "none", filter: "none" };

  const t = progress(localFrame, fps);

  switch (animation) {
    case "fade":
      return { opacity: t, transform: "none", filter: "none" };
    case "pop": {
      const scale = 0.8 + 0.2 * easeOutBack(t);
      return { opacity: Math.min(1, t * 2), transform: `scale(${scale})`, filter: "none" };
    }
    case "rise": {
      const dy = (1 - easeOutCubic(t)) * 0.4; // en em
      return { opacity: t, transform: `translateY(${dy}em)`, filter: "none" };
    }
    case "blur": {
      const blur = (1 - easeOutCubic(t)) * 8; // px
      return { opacity: t, transform: "none", filter: `blur(${blur}px)` };
    }
    default:
      return NEUTRAL;
  }
}
