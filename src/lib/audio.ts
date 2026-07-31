import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";

// ─────────────────────────────────────────────────────────────────────────
// audio.ts — extraction audio serveur (server-only, runtime nodejs).
// Vidéo → mp3 mono 16 kHz 64 kbps : whisper-1 plafonne à 25 Mo, une vidéo
// brute passe rarement (§10 Phase 3, piège n°6). Le binaire ffmpeg vient de
// @ffmpeg-installer/ffmpeg (aucune install système requise).
// ─────────────────────────────────────────────────────────────────────────

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/** Erreur typée pour distinguer « pas de piste audio » du reste. */
export class NoAudioTrackError extends Error {
  constructor() {
    super("Aucune piste audio détectée. Choisis une vidéo avec du son.");
    this.name = "NoAudioTrackError";
  }
}

export function extractAudioToMp3(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(16000)
      .audioBitrate("64k")
      .format("mp3")
      .on("end", () => resolve())
      .on("error", (err: Error) => {
        const msg = err.message.toLowerCase();
        if (
          msg.includes("does not contain any stream") ||
          msg.includes("no audio") ||
          msg.includes("output file #0 does not contain any stream")
        ) {
          reject(new NoAudioTrackError());
        } else {
          reject(err);
        }
      })
      .save(outputPath);
  });
}
