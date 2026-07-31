import { describe, it, expect } from "vitest";
import {
  mapWhisperWordsToWords,
  mapWhisperResponse,
  MIN_WORD_MS,
  type WhisperVerboseResponse,
} from "./openai";
import fixture from "@/test/fixtures/whisper-response.json";

describe("mapWhisperWordsToWords", () => {
  it("convertit les secondes float en ms entières (Math.round)", () => {
    const words = mapWhisperWordsToWords([{ word: "salut", start: 0.42, end: 0.88 }]);
    expect(words).toHaveLength(1);
    expect(words[0]?.startMs).toBe(420);
    expect(words[0]?.endMs).toBe(880);
    expect(words[0]?.confidence).toBeNull();
  });

  it("trim le texte et ignore les mots vides / blancs", () => {
    const words = mapWhisperWordsToWords([
      { word: "  hello  ", start: 0, end: 0.3 },
      { word: "   ", start: 0.3, end: 0.4 },
      { word: "", start: 0.4, end: 0.5 },
    ]);
    expect(words.map((w) => w.text)).toEqual(["hello"]);
  });

  it("clampe endMs à startMs + 40 quand la durée est nulle/négative", () => {
    const words = mapWhisperWordsToWords([{ word: "!", start: 2.0, end: 2.0 }]);
    expect(words[0]?.endMs).toBe(words[0]!.startMs + MIN_WORD_MS);
  });

  it("clampe startMs à 0 (jamais négatif)", () => {
    const words = mapWhisperWordsToWords([{ word: "x", start: -0.1, end: 0.2 }]);
    expect(words[0]?.startMs).toBe(0);
  });

  it("préserve accents, emoji et mots longs", () => {
    const words = mapWhisperWordsToWords([
      { word: "œuvre", start: 0, end: 0.3 },
      { word: "🎬", start: 0.3, end: 0.6 },
      { word: "anticonstitutionnellement", start: 0.6, end: 1.2 },
    ]);
    expect(words.map((w) => w.text)).toEqual([
      "œuvre",
      "🎬",
      "anticonstitutionnellement",
    ]);
  });

  it("génère des id stables non vides et uniques", () => {
    const words = mapWhisperWordsToWords([
      { word: "a", start: 0, end: 0.1 },
      { word: "b", start: 0.1, end: 0.2 },
    ]);
    const ids = words.map((w) => w.id);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(2);
  });

  it("tableau vide → []", () => {
    expect(mapWhisperWordsToWords([])).toEqual([]);
  });
});

describe("mapWhisperResponse (fixture réelle)", () => {
  it("mappe la fixture verbose_json en Word[] propre", () => {
    const words = mapWhisperResponse(fixture as WhisperVerboseResponse);
    // 8 entrées dans la fixture, dont 1 blanc ignoré → 7 mots
    expect(words).toHaveLength(7);
    expect(words[0]?.text).toBe("Bonjour");
    expect(words[0]?.startMs).toBe(0);
    // le "!" (start==end) doit être clampé
    const bang = words.find((w) => w.text === "!");
    expect(bang?.endMs).toBe(bang!.startMs + MIN_WORD_MS);
    // tous les timings sont des entiers croissants ou égaux
    for (const w of words) {
      expect(Number.isInteger(w.startMs)).toBe(true);
      expect(Number.isInteger(w.endMs)).toBe(true);
      expect(w.endMs).toBeGreaterThan(w.startMs);
    }
  });

  it("réponse sans champ words → []", () => {
    expect(mapWhisperResponse({})).toEqual([]);
  });
});
