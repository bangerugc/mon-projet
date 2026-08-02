"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Dropzone } from "@/components/Dropzone";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";
import { validateVideoFile, validateVideoDurationMs } from "@/lib/upload";
import { uploadVideoViaServer } from "@/lib/upload-client";
import { transcribeVideo } from "@/lib/transcribe-client";

// fps réelle lue plus tard via getVideoMetadata (Phase 4) ; défaut raisonnable
// en attendant, la preview HTML5 ne dépend pas de la fps.
const DEFAULT_FPS = 30;

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; progress: number }
  | { phase: "done" }
  | { phase: "skipped"; message: string }
  | { phase: "error"; message: string };

type TranscriptInfo = { demo: boolean; empty: boolean } | null;

/** Lit durée + dimensions d'une vidéo à partir de son URL (métadonnées seules). */
function readVideoMeta(
  url: string,
): Promise<{ durationMs: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      resolve({
        durationMs: Math.round(video.duration * 1000),
        width: video.videoWidth,
        height: video.videoHeight,
      });
    video.onerror = () => reject(new Error("metadata"));
    video.src = url;
  });
}

export default function HomePage() {
  const videoSrc = useEditorStore((s) => s.videoSrc);
  const words = useEditorStore((s) => s.words);
  const transcription = useEditorStore((s) => s.transcription);
  const setVideoSrc = useEditorStore((s) => s.setVideoSrc);
  const setVideoMeta = useEditorStore((s) => s.setVideoMeta);
  const setWords = useEditorStore((s) => s.setWords);
  const setTranscriptionStatus = useEditorStore((s) => s.setTranscriptionStatus);
  const reset = useEditorStore((s) => s.reset);

  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadState>({ phase: "idle" });
  const [transcriptInfo, setTranscriptInfo] = useState<TranscriptInfo>(null);
  const [preparing, setPreparing] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const revokeCurrent = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const startBackgroundUpload = useCallback(async (file: File) => {
    setUpload({ phase: "uploading", progress: 0 });
    // Upload via le serveur (pas de CORS bucket requis). Progression 0→1.
    const res = await uploadVideoViaServer(file, (f) =>
      setUpload({ phase: "uploading", progress: f }),
    );
    if (res.status === "not_configured") {
      setUpload({ phase: "skipped", message: res.message });
      return;
    }
    if (res.status === "error") {
      setUpload({ phase: "error", message: res.message });
      return;
    }
    // URL S3 https → /api/render présigne un GET pour Lambda (jamais le blob).
    useEditorStore.getState().setS3Url(res.data.publicUrl);
    setUpload({ phase: "done" });
  }, []);

  const startTranscription = useCallback(
    async (file: File) => {
      setTranscriptInfo(null);
      setTranscriptionStatus("transcribing");
      const result = await transcribeVideo(file);
      if (result.status === "error") {
        setTranscriptionStatus("error", result.message);
        setError(result.message);
        return;
      }
      setWords(result.words);
      setTranscriptInfo({ demo: result.demo, empty: result.empty });
      setTranscriptionStatus("ready");
    },
    [setWords, setTranscriptionStatus],
  );

  const onSelect = useCallback(
    async (file: File) => {
      setError(null);

      const fileCheck = validateVideoFile({ type: file.type, size: file.size });
      if (!fileCheck.ok) {
        setError(fileCheck.reason);
        return;
      }

      // Préparation en cours → affiche un chargement à la place de la dropzone.
      setPreparing(true);

      // Preview instantanée (§10 Phase 2) : blob local, aucune attente réseau.
      revokeCurrent();
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;

      let meta: { durationMs: number; width: number; height: number };
      try {
        meta = await readVideoMeta(url);
      } catch {
        revokeCurrent();
        setPreparing(false);
        setError("Impossible de lire cette vidéo. Vérifie qu'elle n'est pas corrompue.");
        return;
      }

      const durationCheck = validateVideoDurationMs(meta.durationMs);
      if (!durationCheck.ok) {
        revokeCurrent();
        setPreparing(false);
        setError(durationCheck.reason);
        return;
      }

      setVideoLoading(true);
      setVideoSrc(url);
      setVideoMeta({
        width: meta.width,
        height: meta.height,
        fps: DEFAULT_FPS,
        durationMs: meta.durationMs,
      });
      setPreparing(false);

      // Upload S3 + transcription en parallèle — n'empêchent pas la preview.
      void startBackgroundUpload(file);
      void startTranscription(file);
    },
    [setVideoSrc, setVideoMeta, startBackgroundUpload, startTranscription],
  );

  const onReset = () => {
    revokeCurrent();
    reset();
    setError(null);
    setUpload({ phase: "idle" });
    setTranscriptInfo(null);
    setPreparing(false);
    setVideoLoading(false);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-sand">
          Auto-Captions
        </span>
        <h1 className="text-xl font-semibold text-ink">Nouvelle vidéo</h1>
      </header>

      {!videoSrc ? (
        preparing ? (
          <PreparingCard />
        ) : (
          <Dropzone onSelect={onSelect} />
        )
      ) : (
        <div className="flex flex-col gap-4" data-testid="preview">
          {/* Preview compacte, cadrée façon Reels (9:16) — jamais géante. */}
          <div className="flex justify-center">
            <div className="relative">
              <video
                src={videoSrc}
                controls
                playsInline
                onLoadedData={() => setVideoLoading(false)}
                onCanPlay={() => setVideoLoading(false)}
                className="max-h-[62vh] w-auto max-w-full rounded-xl border border-line bg-black shadow-sm"
              />
              {videoLoading && (
                <div
                  data-testid="video-loading"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/40 backdrop-blur-[1px]"
                >
                  <Loader2 className="size-7 animate-spin text-white" />
                  <span className="text-xs text-white/80">Chargement…</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <UploadStatus state={upload} />
            <Button variant="outline" onClick={onReset} data-testid="reset">
              Changer de vidéo
            </Button>
          </div>

          <Transcript
            status={transcription.status}
            info={transcriptInfo}
            words={words}
          />

          {transcription.status === "ready" && words.length > 0 && (
            <Link
              href="/editor"
              data-testid="go-editor"
              className={cn(buttonVariants(), "h-10 w-full")}
            >
              Éditer les sous-titres →
            </Link>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          data-testid="error"
          className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink"
        >
          {error}
        </p>
      )}
    </main>
  );
}

// Chargement affiché le temps que la vidéo se prépare (à la place de la dropzone).
function PreparingCard() {
  return (
    <div
      data-testid="preparing"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-line bg-panel px-6 py-16"
    >
      <Loader2 className="size-6 animate-spin text-ink-dim" />
      <span className="text-sm text-ink-dim">Préparation de la vidéo…</span>
    </div>
  );
}

function UploadStatus({ state }: { state: UploadState }) {
  const label = (() => {
    switch (state.phase) {
      case "uploading":
        return `Envoi… ${Math.round(state.progress * 100)}%`;
      case "done":
        return "Envoyée sur S3";
      case "skipped":
        return "Preview locale (upload S3 désactivé)";
      case "error":
        return state.message;
      case "idle":
      default:
        return "";
    }
  })();

  return (
    <span data-testid="upload-status" className="font-mono text-xs text-ink-dim">
      {label}
    </span>
  );
}

function Transcript({
  status,
  info,
  words,
}: {
  status: "idle" | "uploading" | "transcribing" | "ready" | "error";
  info: TranscriptInfo;
  words: { id: string; text: string }[];
}) {
  if (status === "transcribing") {
    return (
      <div data-testid="transcript-status" className="flex flex-col gap-2">
        <span className="text-sm text-ink-dim">Transcription en cours…</span>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-brand"
            style={{ animation: "ac-indeterminate 1.1s ease-in-out infinite" }}
          />
        </div>
      </div>
    );
  }
  if (status !== "ready") return null;

  return (
    <section className="flex flex-col gap-3" data-testid="transcript">
      <div className="flex items-center gap-2">
        <span data-testid="transcript-status" className="text-sm text-ink">
          {words.length} mot{words.length > 1 ? "s" : ""} transcrit
          {words.length > 1 ? "s" : ""}
        </span>
        {info?.demo && (
          <span className="rounded border border-line px-1.5 py-0.5 text-xs text-sand">
            démo — ajoute ta clé OpenAI
          </span>
        )}
      </div>

      {info?.empty && (
        <p className="text-sm text-ink-dim">
          Aucune parole détectée. Choisis une vidéo avec du son.
        </p>
      )}
    </section>
  );
}
