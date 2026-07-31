import { NextResponse } from "next/server";
import { writeFile, rm } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nanoid } from "nanoid";
import OpenAI from "openai";
import { extractAudioToMp3, NoAudioTrackError } from "@/lib/audio";
import { mapWhisperResponse, type WhisperVerboseResponse } from "@/lib/openai";
import { DEMO_WORDS } from "@/lib/demo-transcript";

// Transcription serveur : ffmpeg (extraction audio) puis OpenAI whisper-1.
// Runtime nodejs (ffmpeg + fs), durée relevée pour les vidéos longues.
export const runtime = "nodejs";
export const maxDuration = 300;

type OpenAiLikeError = { status?: number; message?: string };

function mapOpenAiError(error: unknown): { status: number; message: string } {
  const e = error as OpenAiLikeError;
  if (e?.status === 401) {
    return { status: 401, message: "Clé OpenAI invalide. Vérifie OPENAI_API_KEY." };
  }
  if (e?.status === 429) {
    return { status: 429, message: "Quota OpenAI dépassé. Réessaie plus tard." };
  }
  return { status: 502, message: "La transcription a échoué. Réessaie." };
}

export async function POST(request: Request) {
  let file: Blob | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof Blob) file = f;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }

  // Mode démo : pas de clé → transcription factice, flux utilisable sans coût.
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ words: DEMO_WORDS, demo: true, empty: false });
  }

  const base = join(tmpdir(), `ac-${nanoid()}`);
  const videoPath = `${base}.src`;
  const mp3Path = `${base}.mp3`;

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(videoPath, bytes);
    await extractAudioToMp3(videoPath, mp3Path);

    const openai = new OpenAI({ apiKey });
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(mp3Path),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    const words = mapWhisperResponse(
      transcription as unknown as WhisperVerboseResponse,
    );
    // 0 mot = silence / pas de parole → l'UI affiche un écran vide explicite.
    return NextResponse.json({ words, demo: false, empty: words.length === 0 });
  } catch (error) {
    if (error instanceof NoAudioTrackError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("[transcribe] échec", error);
    const mapped = mapOpenAiError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  } finally {
    // Nettoyage best-effort des fichiers temporaires.
    await rm(videoPath, { force: true }).catch(() => {});
    await rm(mp3Path, { force: true }).catch(() => {});
  }
}
