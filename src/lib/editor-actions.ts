import { nanoid } from "nanoid";
import type { Word } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// editor-actions.ts — mutations d'édition. TOUTES pures et immutables :
// elles retournent un NOUVEAU Word[] et ne mutent jamais l'entrée (piège n°9 :
// on garde des id stables, jamais l'index comme key React).
// ─────────────────────────────────────────────────────────────────────────

/** Durée minimale d'un mot après édition (§ Phase 3 : clamp endMs >= start+40). */
export const MIN_WORD_DURATION_MS = 40;

/** Supprime le mot `id`. No-op (nouvelle copie) si absent. */
export function deleteWord(words: Word[], id: string): Word[] {
  return words.filter((w) => w.id !== id);
}

/** Remplace le texte du mot `id`. Ne touche pas aux timings. */
export function editWordText(words: Word[], id: string, text: string): Word[] {
  return words.map((w) => (w.id === id ? { ...w, text } : w));
}

/**
 * Coupe le mot `id` en deux. Le texte est coupé au premier espace s'il y en a
 * un, sinon au milieu des caractères. Le temps est coupé au milieu. Le premier
 * morceau garde l'id ; le second reçoit un nanoid neuf. No-op si absent.
 */
export function splitWord(words: Word[], id: string): Word[] {
  const index = words.findIndex((w) => w.id === id);
  if (index === -1) return words.slice();
  const word = words[index];
  if (!word) return words.slice();

  const spaceIdx = word.text.indexOf(" ");
  let leftText: string;
  let rightText: string;
  if (spaceIdx > 0 && spaceIdx < word.text.length - 1) {
    leftText = word.text.slice(0, spaceIdx);
    rightText = word.text.slice(spaceIdx + 1);
  } else {
    const mid = Math.ceil(word.text.length / 2);
    leftText = word.text.slice(0, mid);
    rightText = word.text.slice(mid);
  }

  const midMs = Math.round((word.startMs + word.endMs) / 2);
  const left: Word = { ...word, text: leftText, endMs: midMs };
  const right: Word = {
    id: nanoid(),
    text: rightText,
    startMs: midMs,
    endMs: word.endMs,
    confidence: word.confidence,
  };

  const next = words.slice();
  next.splice(index, 1, left, right);
  return next;
}

/**
 * Fusionne le mot `id` avec le SUIVANT (texte joint par un espace, intervalle
 * étendu). Garde l'id du premier. No-op si `id` absent ou s'il n'y a pas de
 * mot suivant.
 */
export function mergeWords(words: Word[], id: string): Word[] {
  const index = words.findIndex((w) => w.id === id);
  if (index === -1 || index >= words.length - 1) return words.slice();
  const a = words[index];
  const b = words[index + 1];
  if (!a || !b) return words.slice();

  const confidence =
    a.confidence === null || b.confidence === null
      ? null
      : Math.min(a.confidence, b.confidence);

  const merged: Word = {
    id: a.id,
    text: `${a.text} ${b.text}`,
    startMs: a.startMs,
    endMs: b.endMs,
    confidence,
  };

  const next = words.slice();
  next.splice(index, 2, merged);
  return next;
}

/**
 * Fixe start/end absolus du mot `id` (steppers du WordEditor). startMs clampé
 * à >= 0, endMs à >= startMs + MIN_WORD_DURATION_MS. No-op si absent.
 */
export function setWordTiming(
  words: Word[],
  id: string,
  startMs: number,
  endMs: number,
): Word[] {
  return words.map((w) => {
    if (w.id !== id) return w;
    const s = Math.max(0, Math.round(startMs));
    const e = Math.max(s + MIN_WORD_DURATION_MS, Math.round(endMs));
    return { ...w, startMs: s, endMs: e };
  });
}

/**
 * Décale start ET end du mot `id` de `deltaMs` (édition fine au pas de 10 ms
 * dans le WordRail). Garantit endMs >= startMs + MIN_WORD_DURATION_MS.
 * No-op si absent.
 */
export function shiftWordTiming(
  words: Word[],
  id: string,
  deltaMs: number,
): Word[] {
  return words.map((w) => {
    if (w.id !== id) return w;
    const startMs = w.startMs + deltaMs;
    const endMs = Math.max(startMs + MIN_WORD_DURATION_MS, w.endMs + deltaMs);
    return { ...w, startMs, endMs };
  });
}
