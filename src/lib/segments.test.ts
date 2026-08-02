import { describe, it, expect } from "vitest";
import {
  computeKeptSegments,
  segmentsDurationMs,
  originalToCompressedMs,
  remapWordsToSegments,
} from "./segments";
import type { Word } from "./types";

const w = (id: string, startMs: number, endMs: number): Word => ({
  id,
  text: id,
  startMs,
  endMs,
  confidence: null,
});

describe("computeKeptSegments", () => {
  it("aucun mot supprimé → toute la vidéo", () => {
    const all = [w("a", 0, 500), w("b", 500, 1000)];
    expect(computeKeptSegments(all, all, 2000)).toEqual([
      { startMs: 0, endMs: 2000 },
    ]);
  });

  it("coupe la plage d'un mot supprimé (au milieu)", () => {
    const all = [w("a", 0, 500), w("b", 1000, 1500), w("c", 2000, 2500)];
    const kept = [all[0]!, all[2]!]; // "b" supprimé
    expect(computeKeptSegments(all, kept, 3000)).toEqual([
      { startMs: 0, endMs: 1000 },
      { startMs: 1500, endMs: 3000 },
    ]);
  });

  it("fusionne des suppressions consécutives (retake)", () => {
    const all = [w("a", 0, 500), w("b", 1000, 1400), w("c", 1450, 1900), w("d", 2500, 3000)];
    const kept = [all[0]!, all[3]!]; // b+c supprimés, contigus
    expect(computeKeptSegments(all, kept, 3500)).toEqual([
      { startMs: 0, endMs: 1000 },
      { startMs: 1900, endMs: 3500 },
    ]);
  });

  it("durée inconnue → aucun segment", () => {
    expect(computeKeptSegments([w("a", 0, 1)], [], 0)).toEqual([]);
  });
});

describe("segmentsDurationMs", () => {
  it("somme les longueurs (coupures retirées)", () => {
    expect(
      segmentsDurationMs([
        { startMs: 0, endMs: 1000 },
        { startMs: 1500, endMs: 3000 },
      ]),
    ).toBe(2500);
  });
});

describe("originalToCompressedMs", () => {
  const segs = [
    { startMs: 0, endMs: 1000 },
    { startMs: 1500, endMs: 3000 },
  ];
  it("avant la coupure : inchangé", () => {
    expect(originalToCompressedMs(segs, 800)).toBe(800);
  });
  it("après la coupure : décalé de la longueur coupée (500 ms)", () => {
    expect(originalToCompressedMs(segs, 2000)).toBe(1500); // 2000 - 500
  });
  it("dans la coupure : ramené à la fin du contenu gardé précédent", () => {
    expect(originalToCompressedMs(segs, 1200)).toBe(1000);
  });
});

describe("remapWordsToSegments", () => {
  it("remappe les mots gardés sur la timeline compressée", () => {
    const segs = [
      { startMs: 0, endMs: 1000 },
      { startMs: 1500, endMs: 3000 },
    ];
    const kept = [w("a", 0, 500), w("b", 2000, 2500)];
    expect(remapWordsToSegments(kept, segs)).toEqual([
      { id: "a", text: "a", startMs: 0, endMs: 500, confidence: null },
      { id: "b", text: "b", startMs: 1500, endMs: 2000, confidence: null },
    ]);
  });
});
