import type { Word } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Transcription de DÉMO — servie par /api/transcribe quand OPENAI_API_KEY est
// absente, pour que tout le flux (upload → transcription → éditeur) soit
// utilisable et testable en local SANS clé ni coût. L'UI l'indique clairement.
// ids stables (pas de nanoid) → rendu React déterministe.
// ─────────────────────────────────────────────────────────────────────────

export const DEMO_WORDS: Word[] = [
  { id: "demo-1", text: "Ceci", startMs: 0, endMs: 380, confidence: null },
  { id: "demo-2", text: "est", startMs: 380, endMs: 620, confidence: null },
  { id: "demo-3", text: "une", startMs: 620, endMs: 820, confidence: null },
  { id: "demo-4", text: "transcription", startMs: 820, endMs: 1480, confidence: null },
  { id: "demo-5", text: "de", startMs: 1480, endMs: 1640, confidence: null },
  { id: "demo-6", text: "démo.", startMs: 1640, endMs: 2100, confidence: null },
  { id: "demo-7", text: "Ajoute", startMs: 2300, endMs: 2720, confidence: null },
  { id: "demo-8", text: "ta", startMs: 2720, endMs: 2900, confidence: null },
  { id: "demo-9", text: "clé", startMs: 2900, endMs: 3160, confidence: null },
  { id: "demo-10", text: "OpenAI", startMs: 3160, endMs: 3700, confidence: null },
  { id: "demo-11", text: "pour", startMs: 3700, endMs: 3940, confidence: null },
  { id: "demo-12", text: "le", startMs: 3940, endMs: 4100, confidence: null },
  { id: "demo-13", text: "vrai", startMs: 4100, endMs: 4420, confidence: null },
  { id: "demo-14", text: "texte.", startMs: 4420, endMs: 4980, confidence: null },
];
