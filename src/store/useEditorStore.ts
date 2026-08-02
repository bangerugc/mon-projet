import { create } from "zustand";
import { clampOffset } from "@/lib/timing";
import * as actions from "@/lib/editor-actions";
import { removeRepetitions } from "@/lib/openai";
import { computeKeptSegments, remapWordsToSegments } from "@/lib/segments";
import { applyTemplateDefaults } from "@/lib/template-defaults";
import type {
  CaptionRenderProps,
  CaptionStyle,
  TemplateId,
  Word,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// useEditorStore — LE store unique de l'éditeur (§2).
// Détient la vidéo, l'avancement de la transcription, l'état de rendu
// (words + style + offsetMs) formant le CaptionRenderProps unique passé au
// <Player> ET au render Lambda (§3), et l'historique undo/redo des mots.
//
// Undo/redo : historique sur `words` (les éditions destructrices — supprimer,
// couper, fusionner, corriger). C'est le cas critique (§10 Phase 5 : « un
// utilisateur qui supprime un mot par erreur sans undo, il quitte »).
// ─────────────────────────────────────────────────────────────────────────

export type VideoMeta = {
  width: number;
  height: number;
  fps: number;
  durationMs: number;
};

export type TranscriptionStatus =
  | "idle"
  | "uploading"
  | "transcribing"
  | "ready"
  | "error";

export type EditorState = {
  /** blob: en preview, https S3 au render (§13 piège n°3). */
  videoSrc: string | null;
  /** URL S3 https de la vidéo (upload) — utilisée par le render Lambda. */
  s3Url: string | null;
  videoMeta: VideoMeta | null;
  words: Word[];
  style: CaptionStyle;
  offsetMs: number;
  /** Retire automatiquement les répétitions consécutives des sous-titres. */
  dedupeRepetitions: boolean;
  transcription: { status: TranscriptionStatus; error: string | null };
  /** Historique undo/redo des mots. */
  past: Word[][];
  future: Word[][];

  // ── Setters ────────────────────────────────────────────────────────────
  setVideoSrc: (videoSrc: string | null) => void;
  setS3Url: (s3Url: string | null) => void;
  setVideoMeta: (videoMeta: VideoMeta | null) => void;
  /** Nouveau transcript → réinitialise l'historique. */
  setWords: (words: Word[]) => void;
  setStyle: (patch: Partial<CaptionStyle>) => void;
  setTemplate: (templateId: TemplateId) => void;
  /** Clampé dans [-500, 500] (§6). */
  setOffsetMs: (offsetMs: number) => void;
  setDedupeRepetitions: (value: boolean) => void;
  setTranscriptionStatus: (
    status: TranscriptionStatus,
    error?: string | null,
  ) => void;

  // ── Éditions de mots (avec historique) ───────────────────────────────────
  deleteWord: (id: string) => void;
  editWordText: (id: string, text: string) => void;
  splitWord: (id: string) => void;
  mergeWord: (id: string) => void;
  shiftWordTiming: (id: string, deltaMs: number) => void;
  setWordTiming: (id: string, startMs: number, endMs: number) => void;

  // ── Undo / redo ──────────────────────────────────────────────────────────
  undo: () => void;
  redo: () => void;

  reset: () => void;

  /**
   * Dérive le contrat unique. `null` tant qu'aucune vidéo n'est chargée —
   * garantit qu'on ne rend jamais sans source (piège n°3).
   */
  getRenderProps: () => CaptionRenderProps | null;
};

// Défauts = preset "Hormozi 2" : gras italique majuscules, contour, mot actif vert.
export const DEFAULT_STYLE: CaptionStyle = {
  template: "hormozi2",
  font: "poppins",
  fontSize: 7, // % de la largeur vidéo
  color: "#ffffff",
  highlightColor: "#22c55e",
  strokeWidth: 12,
  strokeColor: "#000000",
  uppercase: true,
  animation: "pop",
  maxWordsPerLine: 3,
  positionY: 0.78,
};

const INITIAL = {
  videoSrc: null as string | null,
  s3Url: null as string | null,
  videoMeta: null as VideoMeta | null,
  words: [] as Word[],
  style: DEFAULT_STYLE,
  offsetMs: 0,
  dedupeRepetitions: true,
  transcription: {
    status: "idle" as TranscriptionStatus,
    error: null as string | null,
  },
  past: [] as Word[][],
  future: [] as Word[][],
};

export const useEditorStore = create<EditorState>((set, get) => {
  /** Applique une mutation pure aux mots + empile l'historique. */
  const commit = (producer: (words: Word[]) => Word[]) =>
    set((state) => ({
      words: producer(state.words),
      past: [...state.past, state.words],
      future: [],
    }));

  return {
    ...INITIAL,

    setVideoSrc: (videoSrc) => set({ videoSrc }),
    setS3Url: (s3Url) => set({ s3Url }),
    setVideoMeta: (videoMeta) => set({ videoMeta }),

    // Nouveau transcript : on repart d'un historique vierge.
    setWords: (words) => set({ words, past: [], future: [] }),

    setStyle: (patch) =>
      set((state) => ({ style: { ...state.style, ...patch } })),

    setTemplate: (templateId) =>
      set((state) => ({ style: applyTemplateDefaults(state.style, templateId) })),

    setOffsetMs: (offsetMs) => set({ offsetMs: clampOffset(offsetMs) }),

    setDedupeRepetitions: (dedupeRepetitions) => set({ dedupeRepetitions }),

    setTranscriptionStatus: (status, error = null) =>
      set({ transcription: { status, error } }),

    deleteWord: (id) => commit((w) => actions.deleteWord(w, id)),
    editWordText: (id, text) => commit((w) => actions.editWordText(w, id, text)),
    splitWord: (id) => commit((w) => actions.splitWord(w, id)),
    mergeWord: (id) => commit((w) => actions.mergeWords(w, id)),
    shiftWordTiming: (id, deltaMs) =>
      commit((w) => actions.shiftWordTiming(w, id, deltaMs)),
    setWordTiming: (id, startMs, endMs) =>
      commit((w) => actions.setWordTiming(w, id, startMs, endMs)),

    undo: () =>
      set((state) => {
        const prev = state.past[state.past.length - 1];
        if (prev === undefined) return state;
        return {
          words: prev,
          past: state.past.slice(0, -1),
          future: [state.words, ...state.future],
        };
      }),

    redo: () =>
      set((state) => {
        const next = state.future[0];
        if (next === undefined) return state;
        return {
          words: next,
          past: [...state.past, state.words],
          future: state.future.slice(1),
        };
      }),

    reset: () => set({ ...INITIAL }),

    getRenderProps: () => {
      const { videoSrc, words, style, offsetMs, dedupeRepetitions, videoMeta } =
        get();
      if (!videoSrc) return null;
      const totalMs = videoMeta?.durationMs ?? 0;

      // Dédoublonnage OFF → vidéo entière, mots intacts.
      if (!dedupeRepetitions) {
        const segments = totalMs > 0 ? [{ startMs: 0, endMs: totalMs }] : undefined;
        return { videoSrc, words, style, offsetMs, segments };
      }

      // ON : on retire boucles/bégaiements + retakes des sous-titres. Mots
      // stockés intacts (réversible via le réglage).
      const kept = removeRepetitions(words);

      // Durée connue → on COUPE aussi la vidéo aux mêmes endroits et on remappe
      // les mots sur la timeline compressée → vidéo et sous-titres restent
      // synchro (fix « sous-titres/vidéo trop vite »).
      if (totalMs > 0) {
        const segments = computeKeptSegments(words, kept, totalMs);
        const remapped = remapWordsToSegments(kept, segments);
        return { videoSrc, words: remapped, style, offsetMs, segments };
      }
      // Durée inconnue (cas limite) → sous-titres dédoublonnés, pas de coupe.
      return { videoSrc, words: kept, style, offsetMs };
    },
  };
});
