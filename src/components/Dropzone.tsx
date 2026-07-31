"use client";

import { useRef, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { ACCEPTED_VIDEO_TYPES } from "@/lib/upload";

// Dropzone — drag & drop (desktop) + tap qui ouvre le sélecteur de fichier
// (mobile : le drag & drop n'existe pas sur iOS, le fallback input est
// obligatoire, §10 Phase 2). Cible tactile large (≥ 44px, §5 Phase 5).

type DropzoneProps = {
  onSelect: (file: File) => void;
  disabled?: boolean;
};

export function Dropzone({ onSelect, disabled = false }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onSelect(file);
  };

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  return (
    <button
      type="button"
      onClick={openPicker}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      disabled={disabled}
      aria-label="Déposer ou choisir une vidéo"
      data-testid="dropzone"
      className={[
        "flex w-full flex-col items-center justify-center gap-3 rounded-lg px-6 py-16",
        "border border-dashed transition-colors duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        "disabled:cursor-not-allowed disabled:opacity-50",
        dragging
          ? "border-brand bg-brand/5"
          : "border-line bg-panel hover:border-ink-dim",
      ].join(" ")}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-line text-ink-dim">
        <Upload className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-base font-medium text-ink">Dépose ta vidéo</span>
      <span className="text-sm text-ink-dim">
        ou touche pour choisir un fichier — MP4, MOV ou WebM, 200 Mo max
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_VIDEO_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = ""; // permet de re-sélectionner le même fichier
        }}
      />
    </button>
  );
}
