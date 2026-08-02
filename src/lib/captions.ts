import type { CaptionPage, Word } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// captions.ts — groupement mots → pages + résolution du mot actif.
// Fonctions PURES, zéro React. Utilisé par la composition Remotion et le
// WordRail. `useMemo` côté composant (piège n°10 : ne pas re-render 800 mots).
// ─────────────────────────────────────────────────────────────────────────

export const MIN_WORDS_PER_LINE = 1;
export const MAX_WORDS_PER_LINE = 6;

/**
 * Pause (ms) entre deux mots au-delà de laquelle on FORCE une nouvelle page,
 * même si la limite de mots n'est pas atteinte. Whisper reporte des silences
 * réels (respiration, fin de phrase) : couper dessus fait changer les
 * sous-titres AU RYTHME de la parole plutôt que tous les N mots aveuglément.
 * Choisi > aux micro-gaps intra-phrase (~200-300 ms) pour ne pas sur-découper.
 */
export const PAGE_SPLIT_GAP_MS = 600;

function clampWordsPerLine(n: number): number {
  if (!Number.isFinite(n)) return MIN_WORDS_PER_LINE;
  return Math.min(MAX_WORDS_PER_LINE, Math.max(MIN_WORDS_PER_LINE, Math.floor(n)));
}

/**
 * Découpe une liste de mots en pages. Une nouvelle page démarre quand :
 *   - la page atteint `maxWordsPerLine` mots (borné 1–6), OU
 *   - une PAUSE ≥ PAGE_SPLIT_GAP_MS sépare le mot courant du précédent
 *     (découpe calée sur les silences → sync avec la parole, §8).
 * Chaque page porte son propre intervalle [startMs, endMs] déduit de ses mots.
 * Tableau vide → aucune page.
 */
export function groupWordsIntoPages(
  words: Word[],
  maxWordsPerLine: number,
): CaptionPage[] {
  const size = clampWordsPerLine(maxWordsPerLine);
  const pages: CaptionPage[] = [];
  let chunk: Word[] = [];

  const flush = () => {
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    if (first && last) {
      pages.push({ words: chunk, startMs: first.startMs, endMs: last.endMs });
    }
    chunk = [];
  };

  for (const word of words) {
    const prev = chunk[chunk.length - 1];
    // Coupe si la page est pleine OU si un silence significatif précède ce mot.
    if (prev && (chunk.length >= size || word.startMs - prev.endMs >= PAGE_SPLIT_GAP_MS)) {
      flush();
    }
    chunk.push(word);
  }
  flush();

  return pages;
}

/**
 * Index de la page active à `currentMs`, ou -1 si aucune (silence entre pages).
 * Une page est active sur [startMs, endMs).
 */
export function getActivePageIndex(
  pages: CaptionPage[],
  currentMs: number,
): number {
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (!page) continue;
    if (currentMs >= page.startMs && currentMs < page.endMs) return i;
  }
  return -1;
}

/**
 * Index (relatif à la page active) du mot actif à `currentMs`, ou -1.
 * Un mot est actif sur [startMs, endMs) → à la frontière exacte entre deux
 * mots, c'est le mot suivant qui devient actif.
 */
export function getActiveWordIndex(
  pages: CaptionPage[],
  currentMs: number,
): number {
  const pageIndex = getActivePageIndex(pages, currentMs);
  if (pageIndex === -1) return -1;
  const page = pages[pageIndex];
  if (!page) return -1;

  return getActiveWordInPage(page, currentMs);
}

/** Petit maintien du dernier sous-titre après la fin de la parole (anti-coupure). */
export const PAGE_HOLD_MS = 600;

/**
 * Anticipation : on affiche chaque page ce temps AVANT le `startMs` de son 1er
 * mot. Mesuré sur des vidéos réelles : les timestamps mot-à-mot de Whisper sont
 * fidèles (médiane ≈ +90 ms, soit JUSTE APRÈS le mot). Une anticipation ferait
 * donc apparaître les sous-titres EN AVANCE sur la parole → on la laisse à 0
 * (sous-titres calés pile sur le timing transcrit). Réglage fin possible côté
 * utilisateur via le curseur « Synchro ».
 */
export const CAPTION_LEAD_IN_MS = 0;

/**
 * Index de la page À AFFICHER à `currentMs` (≠ page « active »). Une page reste
 * affichée depuis son `startMs` (moins l'anticipation) JUSQU'AU début de la page
 * suivante → aucun trou entre les pages (pas de clignotement). La dernière page
 * tient encore PAGE_HOLD_MS après sa fin puis disparaît. -1 avant la 1re page.
 */
export function getCurrentPageIndex(
  pages: CaptionPage[],
  currentMs: number,
): number {
  const first = pages[0];
  if (!first || currentMs < first.startMs - CAPTION_LEAD_IN_MS) return -1;

  let idx = 0;
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    if (p && p.startMs - CAPTION_LEAD_IN_MS <= currentMs) idx = i;
    else break;
  }

  const current = pages[idx];
  if (!current) return -1;
  const next = pages[idx + 1];
  // Dernière page : on la cache après un court maintien.
  if (!next && currentMs >= current.endMs + PAGE_HOLD_MS) return -1;
  return idx;
}

/** Index du mot actif DANS une page donnée à `currentMs`, ou -1 (gap inter-mots). */
export function getActiveWordInPage(page: CaptionPage, currentMs: number): number {
  for (let i = 0; i < page.words.length; i++) {
    const word = page.words[i];
    if (!word) continue;
    if (currentMs >= word.startMs && currentMs < word.endMs) return i;
  }
  return -1;
}
