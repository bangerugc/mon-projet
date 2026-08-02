"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Film, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";

const POLL_MS = 1500;

/** Message d'erreur lisible : un échec réseau (fetch qui throw = TypeError,
 *  « Load failed » sur Safari) devient une consigne claire au lieu du jargon. */
function friendlyError(e: unknown): string {
  if (e instanceof TypeError) {
    return "Connexion au serveur perdue. Vérifie que l'app tourne, puis réessaie.";
  }
  return e instanceof Error ? e.message : "Une erreur est survenue.";
}

type ExportState =
  | { phase: "idle" }
  | {
      phase: "rendering";
      progress: number;
      framesRendered: number;
      mock: boolean;
    }
  | { phase: "done"; outputUrl: string; sizeBytes: number | null; mock: boolean }
  | { phase: "error"; message: string };

/** Libellé d'étape déduit de l'avancement — donne du sens au %. */
function phaseLabel(progress: number, framesRendered: number): string {
  if (progress <= 0) return "Initialisation des workers…";
  if (progress >= 0.98) return "Encodage & assemblage du MP4…";
  if (framesRendered > 0) return `Rendu des images — ${framesRendered} rendues`;
  return "Rendu des images…";
}

function formatSize(bytes: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${Math.round(bytes / 1024)} Ko` : `${mb.toFixed(1)} Mo`;
}

/** Anneau de progression avec dégradé de marque et % au centre. */
function ProgressRing({ value }: { value: number }) {
  const size = 168;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, value));
  const pct = Math.round(clamped * 100);
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="exportRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-brand)" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#exportRing)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - clamped)}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <div className="flex items-baseline font-mono tabular-nums">
          <span className="text-5xl font-semibold text-ink">{pct}</span>
          <span className="text-xl text-ink-dim">%</span>
        </div>
      </div>
    </div>
  );
}

export function ExportDialog() {
  const getRenderProps = useEditorStore((s) => s.getRenderProps);
  const s3Url = useEditorStore((s) => s.s3Url);
  const [state, setState] = useState<ExportState>({ phase: "idle" });
  const pollRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  useEffect(() => stopPolling, []);

  const poll = (renderId: string, bucketName: string | null, mock: boolean) => {
    pollRef.current = window.setInterval(async () => {
      try {
        const qs = bucketName ? `?bucketName=${encodeURIComponent(bucketName)}` : "";
        const res = await fetch(`/api/render/${encodeURIComponent(renderId)}${qs}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Erreur de progression.");
        if (body.done && body.outputUrl) {
          stopPolling();
          setState({
            phase: "done",
            outputUrl: body.outputUrl,
            sizeBytes: body.outputSizeInBytes ?? null,
            mock: Boolean(body.mock),
          });
        } else {
          setState({
            phase: "rendering",
            progress: body.overallProgress ?? 0,
            framesRendered: body.framesRendered ?? 0,
            mock,
          });
        }
      } catch (e) {
        stopPolling();
        setState({ phase: "error", message: friendlyError(e) });
      }
    }, POLL_MS);
  };

  const start = async () => {
    const rp = getRenderProps();
    if (!rp) return;
    setState({ phase: "rendering", progress: 0, framesRendered: 0, mock: false });
    try {
      // videoSrc = URL S3 si dispo (render réel), jamais le blob (piège n°3).
      const inputProps = { ...rp, videoSrc: s3Url ?? rp.videoSrc };
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputProps }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Lancement du rendu impossible.");
      poll(body.renderId, body.bucketName ?? null, Boolean(body.mock));
    } catch (e) {
      setState({ phase: "error", message: friendlyError(e) });
    }
  };

  const cancel = () => {
    stopPolling();
    setState({ phase: "idle" });
  };

  return (
    <Dialog onOpenChange={(open) => !open && cancel()}>
      <DialogTrigger className={cn(buttonVariants(), "h-9 gap-1.5")} data-testid="export-open">
        <Download className="size-4" /> Exporter
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exporter la vidéo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-4" data-testid="export-body">
          {state.phase === "idle" && (
            <>
              <div className="flex size-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Film className="size-7" />
              </div>
              <p className="max-w-xs text-center text-sm text-ink-dim">
                Génère le MP4 final avec les sous-titres incrustés, rendu dans le
                cloud (Remotion Lambda) — prêt à publier.
              </p>
              <Button onClick={start} data-testid="export-start" className="w-full">
                Lancer l&apos;export
              </Button>
            </>
          )}

          {state.phase === "rendering" && (
            <div
              className="flex w-full flex-col items-center gap-5"
              data-testid="export-progress"
            >
              <ProgressRing value={state.progress} />

              <div className="flex w-full flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-ink">
                  <Loader2 className="size-4 animate-spin text-brand" />
                  <span data-testid="export-phase">
                    {phaseLabel(state.progress, state.framesRendered)}
                  </span>
                </div>
                {/* Barre fine complémentaire à l'anneau */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.round(Math.min(1, state.progress) * 100)}%` }}
                  />
                </div>
                {state.mock && (
                  <p className="text-center text-xs text-sand">
                    Rendu simulé (AWS non détecté côté serveur).
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                onClick={cancel}
                data-testid="export-cancel"
                className="w-full gap-1.5"
              >
                <X className="size-4" /> Annuler
              </Button>
            </div>
          )}

          {state.phase === "done" && (
            <>
              <div className="flex size-16 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Check className="size-8" strokeWidth={3} />
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-base font-semibold text-ink">Export terminé 🎉</p>
                {formatSize(state.sizeBytes) && (
                  <p className="font-mono text-xs text-ink-dim">
                    {formatSize(state.sizeBytes)}
                  </p>
                )}
              </div>
              {state.mock && (
                <p className="text-center text-xs text-sand">
                  Export simulé (AWS non configuré) — fichier de démo.
                </p>
              )}
              <a
                href={state.outputUrl}
                download
                data-testid="export-download"
                className={cn(buttonVariants(), "h-11 w-full gap-1.5")}
              >
                <Download className="size-4" /> Télécharger la vidéo
              </a>
            </>
          )}

          {state.phase === "error" && (
            <>
              <div className="flex size-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <X className="size-7" strokeWidth={3} />
              </div>
              <p className="text-center text-sm text-ink" data-testid="export-error">
                {state.message}
              </p>
              <Button variant="outline" onClick={start} className="w-full">
                Réessayer
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
