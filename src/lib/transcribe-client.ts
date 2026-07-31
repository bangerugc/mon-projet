import type { Word } from "./types";

// Client de transcription : envoie la vidéo à /api/transcribe (multipart) et
// renvoie les mots. `demo` = transcription factice (pas de clé OpenAI),
// `empty` = aucune parole détectée (silence).

export type TranscribeResult =
  | { status: "ok"; words: Word[]; demo: boolean; empty: boolean }
  | { status: "error"; message: string };

export async function transcribeVideo(file: File): Promise<TranscribeResult> {
  const form = new FormData();
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch("/api/transcribe", { method: "POST", body: form });
  } catch {
    return { status: "error", message: "Réseau indisponible. Réessaie." };
  }

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    words?: Word[];
    demo?: boolean;
    empty?: boolean;
  };

  if (!res.ok) {
    return { status: "error", message: body.error ?? "Transcription échouée." };
  }
  return {
    status: "ok",
    words: body.words ?? [],
    demo: Boolean(body.demo),
    empty: Boolean(body.empty),
  };
}
