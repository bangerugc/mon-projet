import type { Segment, Word } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// segments.ts — découpage de la vidéo aux endroits où des mots ont été retirés
// (répétitions / retakes). Sans ça, on enlève les mots des SOUS-TITRES mais pas
// de la VIDÉO/AUDIO → la vidéo continue de dire les reprises pendant que le
// sous-titre a sauté → désync (« sous-titres/vidéo trop vite »). On coupe donc
// aussi la vidéo : les segments GARDÉS sont concaténés, et les mots gardés sont
// remappés sur cette timeline COMPRESSÉE. Fonctions PURES, testables.
// ─────────────────────────────────────────────────────────────────────────

/** Coupures proches de moins de ce gap → fusionnées (évite les micro-segments). */
const JOIN_GAP_MS = 200;

function mergeRanges(ranges: Segment[]): Segment[] {
  const sorted = [...ranges].sort((a, b) => a.startMs - b.startMs);
  const out: Segment[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.startMs <= last.endMs + JOIN_GAP_MS) {
      last.endMs = Math.max(last.endMs, r.endMs);
    } else {
      out.push({ ...r });
    }
  }
  return out;
}

/**
 * Segments de la vidéo source à CONSERVER = complément des plages des mots
 * supprimés (mots présents dans `originalWords` mais absents de `keptWords`),
 * borné à [0, totalDurationMs]. Aucun mot supprimé → toute la vidéo.
 */
export function computeKeptSegments(
  originalWords: Word[],
  keptWords: Word[],
  totalDurationMs: number,
): Segment[] {
  if (totalDurationMs <= 0) return [];
  const keptIds = new Set(keptWords.map((w) => w.id));
  const removed = originalWords.filter((w) => !keptIds.has(w.id));
  if (removed.length === 0) return [{ startMs: 0, endMs: totalDurationMs }];

  const cuts = mergeRanges(
    removed.map((w) => ({
      startMs: Math.max(0, Math.min(w.startMs, totalDurationMs)),
      endMs: Math.max(0, Math.min(w.endMs, totalDurationMs)),
    })),
  );

  const segments: Segment[] = [];
  let cursor = 0;
  for (const cut of cuts) {
    if (cut.startMs > cursor) segments.push({ startMs: cursor, endMs: cut.startMs });
    cursor = Math.max(cursor, cut.endMs);
  }
  if (cursor < totalDurationMs) segments.push({ startMs: cursor, endMs: totalDurationMs });
  return segments.filter((s) => s.endMs > s.startMs);
}

/** Durée totale (ms) une fois les coupures retirées. */
export function segmentsDurationMs(segments: Segment[]): number {
  return segments.reduce((a, s) => a + (s.endMs - s.startMs), 0);
}

/**
 * Temps ORIGINAL (ms) → temps COMPRESSÉ (ms). Un temps tombant DANS une coupure
 * est ramené à la fin du contenu gardé précédent (pas de saut en avant).
 */
export function originalToCompressedMs(
  segments: Segment[],
  originalMs: number,
): number {
  let acc = 0;
  for (const s of segments) {
    if (originalMs < s.startMs) return acc; // dans une coupure
    if (originalMs <= s.endMs) return acc + (originalMs - s.startMs);
    acc += s.endMs - s.startMs;
  }
  return acc;
}

/** Remappe les mots gardés sur la timeline compressée. */
export function remapWordsToSegments(
  keptWords: Word[],
  segments: Segment[],
): Word[] {
  return keptWords.map((w) => ({
    ...w,
    startMs: originalToCompressedMs(segments, w.startMs),
    endMs: originalToCompressedMs(segments, w.endMs),
  }));
}
