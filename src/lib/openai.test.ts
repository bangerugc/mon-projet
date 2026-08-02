import { describe, it, expect } from "vitest";
import {
  mapWhisperWordsToWords,
  mapWhisperResponse,
  collapseRepetitionLoops,
  collapseRetakes,
  removeRepetitions,
  MIN_WORD_MS,
  LOOP_MIN_REPEATS,
  RETAKE_MIN_ANCHOR,
  type WhisperVerboseResponse,
} from "./openai";
import fixture from "@/test/fixtures/whisper-response.json";
import type { Word } from "./types";

// Construit une séquence de mots à partir de textes (timings croissants).
const seq = (texts: string[]): Word[] =>
  texts.map((text, i) => ({
    id: `w${i}`,
    text,
    startMs: i * 100,
    endMs: i * 100 + 80,
    confidence: null,
  }));
const rep = (block: string[], times: number): string[] =>
  Array.from({ length: times }, () => block).flat();

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

describe("collapseRepetitionLoops (garde-fou boucles Whisper)", () => {
  const texts = (ws: Word[]) => ws.map((w) => w.text);

  it("ne touche pas un texte sans répétition", () => {
    const w = seq(["bonjour", "à", "tous", "bienvenue"]);
    expect(collapseRepetitionLoops(w)).toEqual(w);
  });

  it("préserve une répétition volontaire (2× d'affilée, sous le seuil)", () => {
    const w = seq(rep(["t", "as", "pas", "besoin"], 2));
    expect(collapseRepetitionLoops(w)).toEqual(w); // 2 < 4 → gardé
  });

  it("préserve 3× un mot (emphase)", () => {
    const w = seq(["non", "non", "non", "surtout"]);
    expect(collapseRepetitionLoops(w)).toEqual(w);
  });

  it("collapse une boucle : mot répété LOOP_MIN_REPEATS fois", () => {
    const w = seq(rep(["merci"], LOOP_MIN_REPEATS + 3));
    expect(texts(collapseRepetitionLoops(w))).toEqual(["merci"]);
  });

  it("collapse une boucle de phrase (2 mots × 5)", () => {
    const w = seq([...rep(["merci", "beaucoup"], 5), "salut"]);
    expect(texts(collapseRepetitionLoops(w))).toEqual(["merci", "beaucoup", "salut"]);
  });

  it("réduit à UNE occurrence même pour un nombre PAIR de répétitions (minRepeats=2)", () => {
    // Piège : longest-first voit "je pense" ×4 comme le super-bloc
    // "je pense je pense" ×2 → sans période fondamentale il resterait 2 copies.
    expect(texts(collapseRepetitionLoops(seq(rep(["je", "pense"], 4)), 2))).toEqual([
      "je",
      "pense",
    ]);
    expect(texts(collapseRepetitionLoops(seq(rep(["je", "pense"], 6)), 2))).toEqual([
      "je",
      "pense",
    ]);
    expect(texts(collapseRepetitionLoops(seq(rep(["merci"], 8)), 2))).toEqual(["merci"]);
  });

  it("ne sur-supprime pas un 'aa' interne légitime (période fondamentale)", () => {
    // "a a b" ×2 : le bloc répété est "a a b" (période 3), pas "a".
    expect(texts(collapseRepetitionLoops(seq(rep(["a", "a", "b"], 2)), 2))).toEqual([
      "a",
      "a",
      "b",
    ]);
  });

  it("garde le 1er bloc avec ses timings d'origine", () => {
    const w = seq(rep(["a", "b"], 6));
    const out = collapseRepetitionLoops(w);
    expect(texts(out)).toEqual(["a", "b"]);
    expect(out[0]?.startMs).toBe(0);
    expect(out[1]?.startMs).toBe(100);
  });

  it("ne collapse pas des répétitions espacées (non consécutives)", () => {
    const w = seq(["x", "y", "x", "y", "z", "x", "y"]); // "x y" pas 4× d'affilée
    expect(collapseRepetitionLoops(w)).toEqual(w);
  });
});

describe("mapWhisperWordsToWords — tokens d'hallucination", () => {
  it("jette un token 'Bzzzz…' (même caractère ≥ 8×)", () => {
    const words = mapWhisperWordsToWords([
      { word: "salut", start: 0, end: 0.3 },
      { word: "Bzzzzzzzzzzzzzzzz", start: 0.3, end: 2.0 },
      { word: "fin", start: 2.0, end: 2.3 },
    ]);
    expect(words.map((w) => w.text)).toEqual(["salut", "fin"]);
  });

  it("garde les mots réels avec caractères répétés < 8 (nanana, coool)", () => {
    const words = mapWhisperWordsToWords([
      { word: "nanana", start: 0, end: 0.3 },
      { word: "coool", start: 0.3, end: 0.6 },
    ]);
    expect(words.map((w) => w.text)).toEqual(["nanana", "coool"]);
  });
});

describe("collapseRetakes (prises avortées)", () => {
  const texts = (ws: Word[]) => ws.map((w) => w.text);
  // Ancre de RETAKE_MIN_ANCHOR mots, réutilisée pour construire les cas.
  const anchor = Array.from({ length: RETAKE_MIN_ANCHOR }, (_, k) => `a${k}`);

  it("retire la prise avortée et garde la reprise finale", () => {
    // [ancre + corps1] puis [ancre + corps2] → on garde la 2e prise.
    const w = seq([...anchor, "corps1", ...anchor, "corps2", "suite"]);
    expect(texts(collapseRetakes(w))).toEqual([...anchor, "corps2", "suite"]);
  });

  it("retire un retake séparé par un aparté (gap de quelques mots)", () => {
    const w = seq([...anchor, "aparté", "court", ...anchor, "vraie", "suite"]);
    expect(texts(collapseRetakes(w))).toEqual([...anchor, "vraie", "suite"]);
  });

  it("NE touche PAS une anaphore volontaire (ancre trop courte)", () => {
    // 5 mots communs (< RETAKE_MIN_ANCHOR=6) puis continuations différentes.
    const short = ["c", "est", "pas", "parce", "que"];
    const w = seq([...short, "difficile", ...short, "nuls"]);
    expect(collapseRetakes(w)).toEqual(w);
  });

  it("ne touche pas un texte sans reprise", () => {
    const w = seq([...anchor, "puis", "autre", "chose", "différente"]);
    expect(collapseRetakes(w)).toEqual(w);
  });
});

describe("removeRepetitions (boucles + retakes combinés)", () => {
  const texts = (ws: Word[]) => ws.map((w) => w.text);

  it("collapse d'abord un bégaiement exact puis un retake", () => {
    const anchor = ["m0", "m1", "m2", "m3", "m4", "m5"];
    // bégaiement "salut salut" + retake [ancre]…[ancre]
    const w = seq(["salut", "salut", ...anchor, "corps1", ...anchor, "corps2"]);
    expect(texts(removeRepetitions(w))).toEqual(["salut", ...anchor, "corps2"]);
  });
});
