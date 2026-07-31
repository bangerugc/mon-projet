"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/useEditorStore";
import { snapMs, TIMING_STEP_MS } from "@/lib/timing";
import type { Word } from "@/lib/types";

// WordEditor — édition d'un mot : texte, supprimer, diviser, fusionner, et
// réglage fin start/end au pas de 10 ms (§10 Phase 5).

function formatMs(ms: number): string {
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

export function WordEditor({ word, onClose }: { word: Word; onClose: () => void }) {
  const words = useEditorStore((s) => s.words);
  const editWordText = useEditorStore((s) => s.editWordText);
  const deleteWord = useEditorStore((s) => s.deleteWord);
  const splitWord = useEditorStore((s) => s.splitWord);
  const mergeWord = useEditorStore((s) => s.mergeWord);
  const setWordTiming = useEditorStore((s) => s.setWordTiming);

  const [text, setText] = useState(word.text);
  useEffect(() => setText(word.text), [word.id, word.text]);

  const index = words.findIndex((w) => w.id === word.id);
  const isLast = index === words.length - 1;

  const commitText = () => {
    if (text !== word.text) editWordText(word.id, text);
  };
  const bumpStart = (delta: number) =>
    setWordTiming(word.id, snapMs(word.startMs + delta), word.endMs);
  const bumpEnd = (delta: number) =>
    setWordTiming(word.id, word.startMs, snapMs(word.endMs + delta));

  return (
    <div
      data-testid="word-editor"
      className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-sand">Mot</span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-ink-dim hover:text-ink"
        >
          Fermer
        </button>
      </div>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        data-testid="word-text-input"
        aria-label="Texte du mot"
        // text-base = 16px → pas de zoom auto au focus sur iOS.
        className="w-full rounded-md border border-line bg-bg px-3 py-2 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      />

      <div className="grid grid-cols-2 gap-3">
        <Stepper
          label="Début"
          value={formatMs(word.startMs)}
          onMinus={() => bumpStart(-TIMING_STEP_MS)}
          onPlus={() => bumpStart(TIMING_STEP_MS)}
        />
        <Stepper
          label="Fin"
          value={formatMs(word.endMs)}
          onMinus={() => bumpEnd(-TIMING_STEP_MS)}
          onPlus={() => bumpEnd(TIMING_STEP_MS)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => splitWord(word.id)} data-testid="word-split">
          Diviser
        </Button>
        <Button
          variant="outline"
          onClick={() => mergeWord(word.id)}
          disabled={isLast}
          data-testid="word-merge"
        >
          Fusionner
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            deleteWord(word.id);
            onClose();
          }}
          data-testid="word-delete"
        >
          Supprimer
        </Button>
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ink-dim">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onMinus}
          aria-label={`${label} -10ms`}
          className="h-11 w-11 rounded-md border border-line text-ink hover:bg-white/5"
        >
          −
        </button>
        <span className="flex-1 text-center font-mono text-sm text-ink">{value}</span>
        <button
          type="button"
          onClick={onPlus}
          aria-label={`${label} +10ms`}
          className="h-11 w-11 rounded-md border border-line text-ink hover:bg-white/5"
        >
          +
        </button>
      </div>
    </div>
  );
}
