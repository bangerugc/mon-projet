import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore, DEFAULT_STYLE } from "./useEditorStore";
import type { Word } from "@/lib/types";

const word = (id: string, text: string, startMs: number): Word => ({
  id,
  text,
  startMs,
  endMs: startMs + 200,
  confidence: 1,
});

// L'état Zustand est global → on repart d'un état propre avant chaque test.
beforeEach(() => {
  useEditorStore.getState().reset();
});

describe("useEditorStore", () => {
  it("état initial cohérent", () => {
    const s = useEditorStore.getState();
    expect(s.videoSrc).toBeNull();
    expect(s.words).toEqual([]);
    expect(s.offsetMs).toBe(0);
    expect(s.style.template).toBe("hormozi2");
    expect(s.style.positionY).toBe(0.78);
    expect(s.transcription).toEqual({ status: "idle", error: null });
  });

  it("setWords remplace la liste", () => {
    useEditorStore.getState().setWords([word("a", "le", 0)]);
    expect(useEditorStore.getState().words).toHaveLength(1);
  });

  it("setStyle patche sans écraser le reste", () => {
    useEditorStore.getState().setStyle({ color: "#ffd500", uppercase: true });
    const { style } = useEditorStore.getState();
    expect(style.color).toBe("#ffd500");
    expect(style.uppercase).toBe(true);
    expect(style.template).toBe(DEFAULT_STYLE.template); // inchangé
  });

  it("setOffsetMs est clampé dans [-500, 500]", () => {
    useEditorStore.getState().setOffsetMs(9999);
    expect(useEditorStore.getState().offsetMs).toBe(500);
    useEditorStore.getState().setOffsetMs(-9999);
    expect(useEditorStore.getState().offsetMs).toBe(-500);
  });

  it("getRenderProps est null sans vidéo, complet avec vidéo", () => {
    expect(useEditorStore.getState().getRenderProps()).toBeNull();

    const store = useEditorStore.getState();
    store.setVideoSrc("blob:xyz");
    store.setWords([word("a", "le", 0)]);
    const props = useEditorStore.getState().getRenderProps();
    expect(props).not.toBeNull();
    expect(props?.videoSrc).toBe("blob:xyz");
    expect(props?.words).toHaveLength(1);
    expect(props?.style.template).toBe("hormozi2");
    expect(props?.offsetMs).toBe(0);
  });

  it("setTemplate applique les défauts du template", () => {
    useEditorStore.getState().setTemplate("leon");
    const { style } = useEditorStore.getState();
    expect(style.template).toBe("leon");
    expect(style.uppercase).toBe(true);
    expect(style.font).toBe("komikaAxis");
    expect(style.highlightColor).toBe("#f5511e");
  });

  describe("éditions + undo/redo", () => {
    beforeEach(() => {
      useEditorStore
        .getState()
        .setWords([word("a", "bonjor", 0), word("b", "monde", 500)]);
    });

    it("deleteWord retire le mot et undo le restaure", () => {
      const store = useEditorStore.getState();
      store.deleteWord("a");
      expect(useEditorStore.getState().words.map((w) => w.id)).toEqual(["b"]);
      useEditorStore.getState().undo();
      expect(useEditorStore.getState().words.map((w) => w.id)).toEqual(["a", "b"]);
      useEditorStore.getState().redo();
      expect(useEditorStore.getState().words.map((w) => w.id)).toEqual(["b"]);
    });

    it("editWordText corrige une faute, sans toucher aux timings", () => {
      useEditorStore.getState().editWordText("a", "bonjour");
      const first = useEditorStore.getState().words[0];
      expect(first?.text).toBe("bonjour");
      expect(first?.startMs).toBe(0);
    });

    it("splitWord ajoute un mot, mergeWord en retire un", () => {
      useEditorStore.getState().splitWord("b");
      expect(useEditorStore.getState().words).toHaveLength(3);
      useEditorStore.getState().mergeWord("a");
      expect(useEditorStore.getState().words.length).toBeLessThan(3);
    });

    it("setWords (nouveau transcript) vide l'historique", () => {
      useEditorStore.getState().deleteWord("a");
      expect(useEditorStore.getState().past.length).toBeGreaterThan(0);
      useEditorStore.getState().setWords([word("c", "neuf", 0)]);
      expect(useEditorStore.getState().past).toEqual([]);
      expect(useEditorStore.getState().future).toEqual([]);
    });

    it("undo sans historique est un no-op", () => {
      useEditorStore.getState().setWords([word("a", "x", 0)]); // reset historique
      const before = useEditorStore.getState().words;
      useEditorStore.getState().undo();
      expect(useEditorStore.getState().words).toEqual(before);
    });
  });

  it("cleanRepetitions retire les répétitions consécutives (annulable)", () => {
    const s = useEditorStore.getState();
    s.setWords([
      word("1", "salut", 0),
      word("2", "toi", 100),
      word("3", "salut", 200),
      word("4", "toi", 300),
      word("5", "fin", 400),
    ]);
    s.cleanRepetitions();
    expect(useEditorStore.getState().words.map((w) => w.text)).toEqual([
      "salut",
      "toi",
      "fin",
    ]);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().words).toHaveLength(5);
  });

  it("reset restaure l'état initial", () => {
    const store = useEditorStore.getState();
    store.setVideoSrc("blob:xyz");
    store.setWords([word("a", "le", 0)]);
    store.setStyle({ template: "leon" });
    store.setTranscriptionStatus("error", "boom");
    store.reset();
    const s = useEditorStore.getState();
    expect(s.videoSrc).toBeNull();
    expect(s.words).toEqual([]);
    expect(s.style.template).toBe("hormozi2");
    expect(s.transcription).toEqual({ status: "idle", error: null });
  });
});
