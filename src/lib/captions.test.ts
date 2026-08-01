import { describe, it, expect } from "vitest";
import {
  groupWordsIntoPages,
  getActivePageIndex,
  getActiveWordIndex,
  getCurrentPageIndex,
  getActiveWordInPage,
  PAGE_HOLD_MS,
  MAX_WORDS_PER_LINE,
} from "./captions";
import type { Word } from "./types";

const w = (text: string, startMs: number, endMs: number): Word => ({
  id: `${text}-${startMs}`,
  text,
  startMs,
  endMs,
  confidence: 1,
});

const words: Word[] = [
  w("le", 0, 200),
  w("chat", 200, 500),
  w("dort", 500, 900),
  w("ici", 1200, 1500), // trou 900→1200
];

describe("groupWordsIntoPages", () => {
  it("tableau vide → aucune page", () => {
    expect(groupWordsIntoPages([], 4)).toEqual([]);
  });

  it("groupe par maxWordsPerLine et calcule les intervalles", () => {
    const pages = groupWordsIntoPages(words, 2);
    expect(pages).toHaveLength(2);
    expect(pages[0]?.words.map((x) => x.text)).toEqual(["le", "chat"]);
    expect(pages[0]?.startMs).toBe(0);
    expect(pages[0]?.endMs).toBe(500);
    expect(pages[1]?.startMs).toBe(500);
    expect(pages[1]?.endMs).toBe(1500);
  });

  it("un seul mot → une page d'un mot", () => {
    const pages = groupWordsIntoPages([w("seul", 10, 20)], 4);
    expect(pages).toHaveLength(1);
    expect(pages[0]?.words).toHaveLength(1);
  });

  it("borne maxWordsPerLine dans [1, 6]", () => {
    expect(groupWordsIntoPages(words, 0)).toHaveLength(4); // clampé à 1
    expect(groupWordsIntoPages(words, 999)).toHaveLength(1); // clampé à 6
    expect(groupWordsIntoPages(words, 999)[0]?.words).toHaveLength(4);
    expect(MAX_WORDS_PER_LINE).toBe(6);
  });
});

describe("getActivePageIndex", () => {
  const pages = groupWordsIntoPages(words, 2); // [le,chat] [dort,ici]

  it("trouve la bonne page", () => {
    expect(getActivePageIndex(pages, 100)).toBe(0);
    expect(getActivePageIndex(pages, 600)).toBe(1);
  });
  it("-1 dans un silence entre pages", () => {
    // page1 finit à 500, page2 démarre à 500 → pas de trou ici ; on teste
    // un temps au-delà de la dernière page.
    expect(getActivePageIndex(pages, 5000)).toBe(-1);
  });
  it("-1 sur liste vide", () => {
    expect(getActivePageIndex([], 100)).toBe(-1);
  });
});

describe("getActiveWordIndex", () => {
  const pages = groupWordsIntoPages(words, 2);

  it("mot actif standard", () => {
    expect(getActiveWordIndex(pages, 100)).toBe(0); // "le"
    expect(getActiveWordIndex(pages, 300)).toBe(1); // "chat"
  });

  it("à la frontière exacte, le mot SUIVANT devient actif", () => {
    // 200 = fin de "le" = début de "chat" → doit renvoyer "chat" (index 1)
    expect(getActiveWordIndex(pages, 200)).toBe(1);
  });

  it("-1 pendant un trou à l'intérieur d'une page affichée", () => {
    // page2 = [dort 500-900, ici 1200-1500], affichée sur [500,1500[.
    // À 1000 ms : page active (2e), mais aucun mot (trou 900→1200).
    expect(getActivePageIndex(pages, 1000)).toBe(1);
    expect(getActiveWordIndex(pages, 1000)).toBe(-1);
  });

  it("-1 hors de toute page", () => {
    expect(getActiveWordIndex(pages, 5000)).toBe(-1);
  });
});

describe("getCurrentPageIndex (page persistante — anti-clignotement)", () => {
  // 2 pages avec un TROU entre elles : [a b] 0–800, [c d] 1500–2300.
  const pages = groupWordsIntoPages(
    [w("a", 0, 400), w("b", 400, 800), w("c", 1500, 1900), w("d", 1900, 2300)],
    2,
  );

  it("-1 avant la 1re page", () => {
    const late = groupWordsIntoPages([w("x", 500, 900)], 2);
    expect(getCurrentPageIndex(late, 100)).toBe(-1);
  });

  it("page courante quand on est dedans", () => {
    expect(getCurrentPageIndex(pages, 200)).toBe(0);
    expect(getCurrentPageIndex(pages, 1600)).toBe(1);
  });

  it("⭐ persiste dans le TROU entre deux pages (pas de clignotement)", () => {
    // 1000 ms = après la fin de page0 (800) et avant page1 (1500)
    expect(getCurrentPageIndex(pages, 1000)).toBe(0);
  });

  it("dernière page maintenue PAGE_HOLD_MS puis cachée", () => {
    expect(getCurrentPageIndex(pages, 2300 + PAGE_HOLD_MS - 1)).toBe(1);
    expect(getCurrentPageIndex(pages, 2300 + PAGE_HOLD_MS + 50)).toBe(-1);
  });

  it("aucune page si liste vide", () => {
    expect(getCurrentPageIndex([], 100)).toBe(-1);
  });
});

describe("getActiveWordInPage", () => {
  const [page] = groupWordsIntoPages([w("a", 0, 400), w("b", 400, 800)], 2);

  it("surligne le bon mot", () => {
    expect(getActiveWordInPage(page!, 200)).toBe(0);
    expect(getActiveWordInPage(page!, 500)).toBe(1);
  });

  it("-1 dans un gap inter-mots (page affichée, aucun mot surligné)", () => {
    expect(getActiveWordInPage(page!, 900)).toBe(-1);
  });
});
