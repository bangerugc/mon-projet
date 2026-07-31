"use client";

import { useEffect, useRef, useState } from "react";
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

type ExportState =
  | { phase: "idle" }
  | { phase: "rendering"; progress: number }
  | { phase: "done"; outputUrl: string; mock: boolean }
  | { phase: "error"; message: string };

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

  const poll = (renderId: string, bucketName: string | null) => {
    pollRef.current = window.setInterval(async () => {
      try {
        const qs = bucketName ? `?bucketName=${encodeURIComponent(bucketName)}` : "";
        const res = await fetch(`/api/render/${encodeURIComponent(renderId)}${qs}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Erreur de progression.");
        if (body.done && body.outputUrl) {
          stopPolling();
          setState({ phase: "done", outputUrl: body.outputUrl, mock: Boolean(body.mock) });
        } else {
          setState({ phase: "rendering", progress: body.overallProgress ?? 0 });
        }
      } catch (e) {
        stopPolling();
        setState({ phase: "error", message: e instanceof Error ? e.message : "Erreur." });
      }
    }, POLL_MS);
  };

  const start = async () => {
    const rp = getRenderProps();
    if (!rp) return;
    setState({ phase: "rendering", progress: 0 });
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
      poll(body.renderId, body.bucketName ?? null);
    } catch (e) {
      setState({ phase: "error", message: e instanceof Error ? e.message : "Erreur." });
    }
  };

  const cancel = () => {
    stopPolling();
    setState({ phase: "idle" });
  };

  return (
    <Dialog onOpenChange={(open) => !open && cancel()}>
      <DialogTrigger
        className={cn(buttonVariants(), "h-9")}
        data-testid="export-open"
      >
        Exporter
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exporter la vidéo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2" data-testid="export-body">
          {state.phase === "idle" && (
            <>
              <p className="text-sm text-ink-dim">
                Génère le MP4 final avec les sous-titres incrustés.
              </p>
              <Button onClick={start} data-testid="export-start">
                Lancer l&apos;export
              </Button>
            </>
          )}

          {state.phase === "rendering" && (
            <>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-line"
                data-testid="export-progress"
              >
                <div
                  className="h-full bg-brand transition-[width] duration-300"
                  style={{ width: `${Math.round(state.progress * 100)}%` }}
                />
              </div>
              <p className="font-mono text-xs text-ink-dim">
                Rendu… {Math.round(state.progress * 100)}%
              </p>
              <Button variant="outline" onClick={cancel} data-testid="export-cancel">
                Annuler
              </Button>
            </>
          )}

          {state.phase === "done" && (
            <>
              <p className="text-sm text-ink">Export terminé.</p>
              {state.mock && (
                <p className="text-xs text-sand">
                  Export simulé (AWS non configuré) — le fichier est la vidéo de démo.
                </p>
              )}
              <a
                href={state.outputUrl}
                download
                data-testid="export-download"
                className={cn(buttonVariants(), "h-10")}
              >
                Télécharger la vidéo
              </a>
            </>
          )}

          {state.phase === "error" && (
            <>
              <p className="text-sm text-ink" data-testid="export-error">
                {state.message}
              </p>
              <Button variant="outline" onClick={start}>
                Réessayer
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
