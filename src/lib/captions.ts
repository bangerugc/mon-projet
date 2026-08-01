import type { CaptionPage, Word } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// captions.ts — groupement mots → pages + résolution du mot actif.
// Fonctions PURES, zéro React. Utilisé par la composition Remotion et le
// WordRail. `useMemo` côté composant (piège n°10 : ne pas re-render 800 mots).
// ─────────────────────────────────────────────────────────────────────────

export const MIN_WORDS_PER_LINE = 1;
export const MAX_WORDS_PER_LINE = 6;

function clampWordsPerLine(n: number): number {
  if (!Number.isFinite(n)) return MIN_WORDS_PER_LINE;
  return Math.min(MAX_WORDS_PER_LINE, Math.max(MIN_WORDS_PER_LINE, Math.floor(n)));
}

/**
 * Découpe une liste de mots en pages de `maxWordsPerLine` mots (borné 1–6).
 * Chaque page porte son propre intervalle [startMs, endMs] déduit de ses mots.
 * Tableau vide → aucune page.
 */
export function groupWordsIntoPages(
  words: Word[],
  maxWordsPerLine: number,
): CaptionPage[] {
  const size = clampWordsPerLine(maxWordsPerLine);
  const pages: CaptionPage[] = [];

  for (let i = 0; i < words.length; i += size) {
    const chunk = words.slice(i, i + size);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    // chunk n'est jamais vide ici (i < words.length), mais on satisfait
    // noUncheckedIndexedAccess proprement.
    if (!first || !last) continue;
    pages.push({ words: chunk, startMs: first.startMs, endMs: last.endMs });
  }

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
 * Index de la page À AFFICHER à `currentMs` (≠ page « active »). Une page reste
 * affichée depuis son `startMs` JUSQU'AU début de la page suivante → aucun trou
 * entre les pages (pas de clignotement). La dernière page tient encore
 * PAGE_HOLD_MS après sa fin puis disparaît. -1 avant la 1re page.
 */
export function getCurrentPageIndex(
  pages: CaptionPage[],
  currentMs: number,
): number {
  const first = pages[0];
  if (!first || currentMs < first.startMs) return -1;

  let idx = 0;
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    if (p && p.startMs <= currentMs) idx = i;
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
