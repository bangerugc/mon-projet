"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PlayerRef } from "@remotion/player";
import { PlayerStage } from "@/components/PlayerStage";
import { WordRail } from "@/components/WordRail";
import { WordEditor } from "@/components/WordEditor";
import { StylePanel } from "@/components/StylePanel";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useEditorStore } from "@/store/useEditorStore";
import { frameToMs, msToFrame } from "@/lib/timing";
import { cn } from "@/lib/utils";

export default function EditorPage() {
  const videoSrc = useEditorStore((s) => s.videoSrc);
  const videoMeta = useEditorStore((s) => s.videoMeta);
  const words = useEditorStore((s) => s.words);
  const style = useEditorStore((s) => s.style);
  const offsetMs = useEditorStore((s) => s.offsetMs);
  const setStyle = useEditorStore((s) => s.setStyle);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const getRenderProps = useEditorStore((s) => s.getRenderProps);

  const playerRef = useRef<PlayerRef | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const renderProps = getRenderProps();
  const fps = videoMeta?.fps ?? 30;
  const hasVideo = renderProps !== null;

  // Suivi de la frame courante du Player → sync WordRail.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = (e: { detail: { frame: number } }) =>
      setCurrentFrame(e.detail.frame);
    player.addEventListener("frameupdate", onFrame);
    return () => player.removeEventListener("frameupdate", onFrame);
  }, [hasVideo]);

  // Undo/redo clavier (Cmd/Ctrl+Z, +Shift = redo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

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

  const currentMs = frameToMs(currentFrame, fps) - offsetMs;
  const selectedWord = words.find((w) => w.id === selectedId) ?? null;

  const onWordTap = (id: string) => {
    const w = words.find((x) => x.id === id);
    if (!w) return;
    setSelectedId(id);
    playerRef.current?.seekTo(msToFrame(w.startMs, fps));
  };

  const undoRedoBar = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={undo}
        disabled={!canUndo}
        data-testid="undo"
        aria-label="Annuler"
      >
        ↶ Annuler
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={redo}
        disabled={!canRedo}
        data-testid="redo"
        aria-label="Rétablir"
      >
        ↷ Rétablir
      </Button>
    </div>
  );

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 px-4 py-6"
      style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          ← Retour
        </Link>
        {undoRedoBar}
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* min-w-0 : sans ça, le WordRail (overflow-x) fait déborder la
            colonne horizontalement sur mobile (blowout grid/flex). */}
        <div className="flex min-w-0 flex-col gap-3">
          <PlayerStage
            renderProps={renderProps}
            videoMeta={videoMeta}
            playerRef={playerRef}
            positionY={style.positionY}
            onPositionChange={(y) => setStyle({ positionY: y })}
          />

          <WordRail
            words={words}
            currentMs={currentMs}
            selectedId={selectedId}
            onWordTap={(w) => onWordTap(w.id)}
          />

          {selectedWord && (
            <WordEditor word={selectedWord} onClose={() => setSelectedId(null)} />
          )}

          {/* Mobile : le panneau de style s'ouvre en bottom sheet. */}
          <div className="lg:hidden">
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
        </div>

        {/* Desktop : sidebar. */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-lg border border-line bg-panel p-4">
            <StylePanel />
          </div>
        </aside>
      </div>
    </main>
  );
}
