"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Play, Pause } from "lucide-react";
import type { PlayerRef } from "@remotion/player";
import { PlayerStage } from "@/components/PlayerStage";
import { StylePanel } from "@/components/StylePanel";
import { ExportDialog } from "@/components/ExportDialog";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useEditorStore } from "@/store/useEditorStore";
import { frameToMs } from "@/lib/timing";
import { cn } from "@/lib/utils";

export default function EditorPage() {
  const videoSrc = useEditorStore((s) => s.videoSrc);
  const videoMeta = useEditorStore((s) => s.videoMeta);
  const words = useEditorStore((s) => s.words);
  const style = useEditorStore((s) => s.style);
  const setStyle = useEditorStore((s) => s.setStyle);
  const getRenderProps = useEditorStore((s) => s.getRenderProps);

  const playerRef = useRef<PlayerRef | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);

  const renderProps = getRenderProps();
  const fps = videoMeta?.fps ?? 30;
  const hasVideo = renderProps !== null;

  // Suivi de la frame courante + lecture/pause du Player (timecode).
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = (e: { detail: { frame: number } }) =>
      setCurrentFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, [hasVideo]);

  // Prévenir la perte de travail au rechargement (§11).
  useEffect(() => {
    if (words.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [words.length]);

  if (!videoSrc || !videoMeta || !renderProps) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-ink">Aucune vidéo en cours. Reviens à l&apos;accueil.</p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  const videoMs = frameToMs(currentFrame, fps);

  return (
    <main className="flex min-h-dvh flex-col bg-bg lg:h-dvh lg:overflow-hidden">
      {/* Barre du haut */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
          >
            <ChevronLeft className="size-4" /> Retour
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="size-2 rounded-full bg-brand" />
            <span className="text-sm font-medium text-ink">Éditeur</span>
          </div>
        </div>
        <ExportDialog />
      </header>

      {/* Corps : gouttière gauche (vide, = largeur du panneau) + scène centrée
          + panneau (droite). La gouttière équilibre le panneau → l'aperçu est
          centré par rapport à la PAGE, pas seulement à la zone de gauche. */}
      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-[360px_minmax(0,1fr)_360px]">
        <section className="flex min-w-0 flex-col p-4 lg:col-start-2 lg:min-h-0 lg:overflow-y-auto lg:p-6">
          {/* Player centré + barre de lecture */}
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 lg:min-h-0">
            <PlayerStage
              renderProps={renderProps}
              videoMeta={videoMeta}
              playerRef={playerRef}
              positionY={style.positionY}
              onPositionChange={(y) => setStyle({ positionY: y })}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => playerRef.current?.toggle()}
                aria-label={playing ? "Pause" : "Lecture"}
                data-testid="play-toggle"
                className="flex size-10 items-center justify-center rounded-full bg-ink text-bg transition-transform active:scale-95"
              >
                {playing ? (
                  <Pause className="size-4" fill="currentColor" />
                ) : (
                  <Play className="size-4 translate-x-px" fill="currentColor" />
                )}
              </button>
              <span className="font-mono text-xs tabular-nums text-ink-dim">
                {formatClock(videoMs)} / {formatClock(videoMeta.durationMs)}
              </span>
            </div>
          </div>

          {/* Mobile : panneau de style en bottom sheet */}
          <div className="shrink-0 pt-4 lg:hidden">
            <Sheet>
              <SheetTrigger
                className={cn(buttonVariants({ variant: "outline" }), "h-10 w-full")}
                data-testid="open-style"
              >
                Style & position
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Style & position</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-6">
                  <StylePanel />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </section>

        {/* Desktop : sidebar avec scroll interne (la page ne scrolle pas) */}
        <aside className="hidden border-l border-line bg-panel lg:col-start-3 lg:block lg:min-h-0 lg:overflow-y-auto">
          <div className="p-5">
            <StylePanel />
          </div>
        </aside>
      </div>
    </main>
  );
}

/** Timecode mm:ss — secondes tronquées (comme tout lecteur vidéo). */
function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
