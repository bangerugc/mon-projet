import { nanoid } from "nanoid";
import type { Word } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// openai.ts — mapping de la réponse Whisper (verbose_json, word-level) vers
// notre type Word. La partie PURE (mapWhisperWordsToWords) est testable sans
// réseau ni clé. L'appel réseau lui-même vit dans /api/transcribe.
//
// Règles (§10 Phase 3, §6) :
//   - secondes float → millisecondes ENTIÈRES via Math.round
//   - virer les mots vides / espaces
//   - clamp : endMs >= startMs + 40 (évite les durées nulles/négatives)
//   - startMs >= 0
//   - whisper-1 ne renvoie pas de confiance par mot → confidence: null
// ─────────────────────────────────────────────────────────────────────────

/** Un mot tel que renvoyé par OpenAI whisper-1 en verbose_json. */
export type WhisperWord = {
  word: string;
  start: number;
  end: number;
};

export type WhisperVerboseResponse = {
  text?: string;
  words?: WhisperWord[];
};

export const MIN_WORD_MS = 40;

export function mapWhisperWordsToWords(words: WhisperWord[]): Word[] {
  const result: Word[] = [];
  for (const raw of words) {
    const text = (raw.word ?? "").trim();
    if (!text) continue; // ignore les mots vides / blancs

    const startMs = Math.max(0, Math.round((raw.start ?? 0) * 1000));
    const rawEndMs = Math.round((raw.end ?? 0) * 1000);
    const endMs = Math.max(rawEndMs, startMs + MIN_WORD_MS);

    result.push({ id: nanoid(), text, startMs, endMs, confidence: null });
  }
  return result;
}

export function mapWhisperResponse(response: WhisperVerboseResponse): Word[] {
  return mapWhisperWordsToWords(response.words ?? []);
}
