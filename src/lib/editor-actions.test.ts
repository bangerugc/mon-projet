import { describe, it, expect } from "vitest";
import {
  deleteWord,
  editWordText,
  splitWord,
  mergeWords,
  shiftWordTiming,
  setWordTiming,
  MIN_WORD_DURATION_MS,
} from "./editor-actions";
import type { Word } from "./types";

const w = (id: string, text: string, startMs: number, endMs: number): Word => ({
  id,
  text,
  startMs,
  endMs,
  confidence: 1,
});

const base = (): Word[] => [
  w("a", "le", 0, 200),
  w("b", "chat", 200, 600),
  w("c", "dort", 600, 1000),
];

// Vérifie qu'une action n'a pas muté l'entrée.
function expectImmutable(input: Word[], action: () => void) {
  const snapshot = JSON.stringify(input);
  action();
  expect(JSON.stringify(input)).toBe(snapshot);
}

describe("deleteWord", () => {
  it("supprime le premier mot", () => {
    expect(deleteWord(base(), "a").map((x) => x.id)).toEqual(["b", "c"]);
  });
  it("supprime le dernier mot", () => {
    expect(deleteWord(base(), "c").map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("id inconnu → inchangé", () => {
    expect(deleteWord(base(), "zzz")).toHaveLength(3);
  });
  it("est immutable", () => {
    const input = base();
    expectImmutable(input, () => deleteWord(input, "a"));
  });
});

describe("editWordText", () => {
  it("change le texte, garde les timings", () => {
    const out = editWordText(base(), "b", "chien");
    const target = out.find((x) => x.id === "b");
    expect(target?.text).toBe("chien");
    expect(target?.startMs).toBe(200);
    expect(target?.endMs).toBe(600);
  });
  it("gère accents / apostrophes / œ", () => {
    const out = editWordText(base(), "a", "l'œuf çà");
    expect(out.find((x) => x.id === "a")?.text).toBe("l'œuf çà");
  });
  it("est immutable", () => {
    const input = base();
    expectImmutable(input, () => editWordText(input, "b", "chien"));
  });
});

describe("splitWord", () => {
  it("coupe au milieu du temps et garde/crée les ids", () => {
    const out = splitWord(base(), "b"); // "chat" 200-600
    expect(out).toHaveLength(4);
    const left = out[1];
    const right = out[2];
    expect(left?.id).toBe("b"); // le premier garde l'id
    expect(left?.startMs).toBe(200);
    expect(left?.endMs).toBe(400); // milieu
    expect(right?.startMs).toBe(400);
    expect(right?.endMs).toBe(600);
    expect(right?.id).toBeTruthy();
    expect(right?.id).not.toBe("b"); // nouvel id
  });
  it("coupe au premier espace si présent", () => {
    const out = splitWord([w("x", "bon jour", 0, 400)], "x");
    expect(out.map((o) => o.text)).toEqual(["bon", "jour"]);
  });
  it("id inconnu → inchangé", () => {
    expect(splitWord(base(), "zzz")).toHaveLength(3);
  });
  it("est immutable", () => {
    const input = base();
    expectImmutable(input, () => splitWord(input, "b"));
  });
});

describe("mergeWords", () => {
  it("fusionne avec le suivant", () => {
    const out = mergeWords(base(), "a"); // le + chat
    expect(out).toHaveLength(2);
    expect(out[0]?.id).toBe("a");
    expect(out[0]?.text).toBe("le chat");
    expect(out[0]?.startMs).toBe(0);
    expect(out[0]?.endMs).toBe(600);
  });
  it("dernier mot → pas de suivant → inchangé", () => {
    expect(mergeWords(base(), "c")).toHaveLength(3);
  });
  it("confidence null si l'un des deux est null", () => {
    const list = [w("a", "le", 0, 200), { ...w("b", "chat", 200, 600), confidence: null }];
    expect(mergeWords(list, "a")[0]?.confidence).toBeNull();
  });
  it("est immutable", () => {
    const input = base();
    expectImmutable(input, () => mergeWords(input, "a"));
  });
});

describe("shiftWordTiming", () => {
  it("décale start et end", () => {
    const out = shiftWordTiming(base(), "b", 50);
    const t = out.find((x) => x.id === "b");
    expect(t?.startMs).toBe(250);
    expect(t?.endMs).toBe(650);
  });
  it("décale vers le négatif", () => {
    const out = shiftWordTiming(base(), "a", -100);
    const t = out.find((x) => x.id === "a");
    expect(t?.startMs).toBe(-100);
    expect(t?.endMs).toBe(100);
  });
  it("garantit une durée minimale", () => {
    // mot court poussé de façon à ce que end passe sous start+40
    const out = shiftWordTiming([w("x", "a", 0, 30)], "x", 0);
    const t = out[0];
    expect(t?.endMs).toBeGreaterThanOrEqual((t?.startMs ?? 0) + MIN_WORD_DURATION_MS);
  });
  it("est immutable", () => {
    const input = base();
    expectImmutable(input, () => shiftWordTiming(input, "b", 50));
  });
});

describe("setWordTiming", () => {
  it("fixe start/end (arrondis à l'entier)", () => {
    const out = setWordTiming(base(), "b", 480.6, 900.2);
    const b = out.find((x) => x.id === "b");
    expect(b?.startMs).toBe(481);
    expect(b?.endMs).toBe(900);
  });

  it("clampe startMs à >= 0", () => {
    const out = setWordTiming(base(), "a", -100, 300);
    expect(out[0]?.startMs).toBe(0);
  });

  it("garantit endMs >= startMs + durée minimale", () => {
    const out = setWordTiming(base(), "b", 500, 500);
    const b = out.find((x) => x.id === "b");
    expect(b?.endMs).toBe(500 + MIN_WORD_DURATION_MS);
  });

  it("no-op si l'id est absent", () => {
    const input = base();
    expect(setWordTiming(input, "zzz", 0, 100)).toEqual(input);
  });

  it("est immutable", () => {
    const input = base();
    expectImmutable(input, () => setWordTiming(input, "b", 100, 300));
  });
});
