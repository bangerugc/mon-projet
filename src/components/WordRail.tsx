"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Word } from "@/lib/types";

// WordRail — timeline de mots (§7, élément signature). Largeur de chaque puce
// ∝ durée réelle du mot ; les silences sont des trous. Tap = sélection + seek.
// Scroll horizontal auto-synchronisé au mot actif pendant la lecture.

const PX_PER_MS = 0.08; // 1 s ≈ 80 px
const MIN_CHIP_PX = 44; // cible tactile (§ mobile)
const GAP_THRESHOLD_MS = 120; // en dessous, pas de trou visible

type WordRailProps = {
  words: Word[];
  currentMs: number;
  selectedId: string | null;
  onWordTap: (word: Word) => void;
};

export function WordRail({ words, currentMs, selectedId, onWordTap }: WordRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const activeId = useMemo(() => {
    const w = words.find((x) => currentMs >= x.startMs && currentMs < x.endMs);
    return w?.id ?? null;
  }, [words, currentMs]);

  // Auto-scroll pour garder le mot actif visible.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [activeId]);

  if (words.length === 0) {
    return (
      <p className="text-sm text-ink-dim">
        Aucun mot. Choisis une vidéo avec du son.
      </p>
    );
  }

  return (
    <div
      ref={scrollRef}
      data-testid="word-rail"
      className="flex items-stretch gap-1 overflow-x-auto rounded-lg border border-line bg-panel p-2"
      style={{ scrollbarWidth: "thin" }}
    >
      {words.map((w, i) => {
        const prev = words[i - 1];
        const gapMs = prev ? w.startMs - prev.endMs : 0;
        const width = Math.max(MIN_CHIP_PX, (w.endMs - w.startMs) * PX_PER_MS);
        const active = w.id === activeId;
        const selected = w.id === selectedId;
        return (
          <div key={w.id} className="flex items-stretch">
            {gapMs > GAP_THRESHOLD_MS && (
              <span
                aria-hidden
                className="self-center"
                style={{ width: Math.min(80, gapMs * PX_PER_MS) }}
              />
            )}
            <button
              ref={active ? activeRef : undefined}
              type="button"
              onClick={() => onWordTap(w)}
              data-testid={`word-${w.id}`}
              data-active={active || undefined}
              className={[
                "min-h-11 shrink-0 rounded px-2 text-sm transition-colors duration-150 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                active
                  ? "bg-brand text-white"
                  : "bg-transparent text-ink hover:bg-white/5",
                selected ? "ring-2 ring-brand" : "",
              ].join(" ")}
              style={{ width }}
            >
              <span className="block truncate">{w.text}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
