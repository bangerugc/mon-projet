"use client";

import { useRef, useState, type PointerEvent, type RefObject } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { CaptionsComposition } from "@/remotion/CaptionsComposition";
import type { CaptionRenderProps } from "@/lib/types";
import type { VideoMeta } from "@/store/useEditorStore";

// PlayerStage — <Player> Remotion + overlay de drag vertical des sous-titres.
// Drag en Pointer Events (marche souris ET doigt), setPointerCapture,
// touch-action:none. Tap (sans déplacement) = play/pause.

const SNAP_POINTS = [0.15, 0.5, 0.78];
const SNAP_TOLERANCE = 0.02;
const DRAG_THRESHOLD_PX = 6;

function snap(y: number): number {
  for (const p of SNAP_POINTS) {
    if (Math.abs(y - p) <= SNAP_TOLERANCE) return p;
  }
  return y;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

type PlayerStageProps = {
  renderProps: CaptionRenderProps;
  videoMeta: VideoMeta;
  playerRef: RefObject<PlayerRef | null>;
  positionY: number;
  onPositionChange: (positionY: number) => void;
};

export function PlayerStage({
  renderProps,
  videoMeta,
  playerRef,
  positionY,
  onPositionChange,
}: PlayerStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const movedRef = useRef(false);
  const startYRef = useRef(0);

  const durationInFrames = Math.max(
    1,
    Math.round((videoMeta.durationMs / 1000) * videoMeta.fps),
  );

  const yFromPointer = (clientY: number): number => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.height === 0) return positionY;
    return clamp((clientY - rect.top) / rect.height, 0.05, 0.95);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    movedRef.current = false;
    startYRef.current = e.clientY;
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    // Au-delà du seuil, c'est un vrai drag (pas un tap).
    if (Math.abs(e.clientY - startYRef.current) > DRAG_THRESHOLD_PX) {
      movedRef.current = true;
    }
    if (movedRef.current) onPositionChange(snap(yFromPointer(e.clientY)));
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    // Déplacement négligeable = tap → play/pause.
    if (!movedRef.current) playerRef.current?.toggle();
    else onPositionChange(snap(yFromPointer(e.clientY)));
  };

  return (
    <div
      ref={stageRef}
      className="relative w-full overflow-hidden rounded-lg border border-line bg-black"
      style={{ aspectRatio: `${videoMeta.width} / ${videoMeta.height}` }}
    >
      <Player
        ref={playerRef}
        component={CaptionsComposition}
        inputProps={renderProps}
        durationInFrames={durationInFrames}
        fps={videoMeta.fps}
        compositionWidth={videoMeta.width}
        compositionHeight={videoMeta.height}
        style={{ width: "100%", height: "100%" }}
        acknowledgeRemotionLicense
        controls={false}
      />

      {/* Overlay de drag : capte le pointeur, jamais bloqué par un scroll tactile. */}
      <div
        data-testid="drag-overlay"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
      />

      {/* Guides de snap visibles PENDANT le drag uniquement. */}
      {dragging &&
        SNAP_POINTS.map((p) => (
          <div
            key={p}
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-brand/60"
            style={{ top: `${p * 100}%` }}
          />
        ))}

      {/* Ligne de position courante pendant le drag. */}
      {dragging && (
        <div
          className="pointer-events-none absolute inset-x-0 border-t-2 border-brand"
          style={{ top: `${positionY * 100}%` }}
        />
      )}
    </div>
  );
}
