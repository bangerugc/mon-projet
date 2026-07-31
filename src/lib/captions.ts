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

  for (let i = 0; i < page.words.length; i++) {
    const word = page.words[i];
    if (!word) continue;
    if (currentMs >= word.startMs && currentMs < word.endMs) return i;
  }
  return -1; // page affichée mais gap inter-mots (aucun mot surligné)
}
