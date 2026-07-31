// ─────────────────────────────────────────────────────────────────────────
// upload.ts — règles de validation d'une vidéo à l'upload (§10 Phase 2).
// Fonctions PURES (elles prennent des primitives, pas un objet File du DOM),
// donc testables côté serveur ET client, et réutilisables dans /api/upload-url.
// ─────────────────────────────────────────────────────────────────────────

/** Types MIME acceptés (§10 Phase 2). */
export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime", // .mov
  "video/webm",
] as const;

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 Mo
export const MAX_DURATION_MS = 10 * 60 * 1000; // 10 min

export type ValidationResult = { ok: true } | { ok: false; reason: string };

const isAcceptedType = (type: string): boolean =>
  (ACCEPTED_VIDEO_TYPES as readonly string[]).includes(type);

/**
 * Valide le type MIME et la taille d'un fichier. Messages d'erreur clairs et
 * actionnables (§7 : dire ce qui s'est passé ET quoi faire).
 */
export function validateVideoFile(file: {
  type: string;
  size: number;
}): ValidationResult {
  if (!isAcceptedType(file.type)) {
    return {
      ok: false,
      reason: "Format non supporté. Choisis une vidéo MP4, MOV ou WebM.",
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: "Vidéo trop lourde (200 Mo max). Compresse-la ou raccourcis-la.",
    };
  }
  if (file.size <= 0) {
    return { ok: false, reason: "Fichier vide ou illisible. Choisis une autre vidéo." };
  }
  return { ok: true };
}

/** Valide la durée (connue seulement après lecture des métadonnées côté client). */
export function validateVideoDurationMs(durationMs: number): ValidationResult {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return {
      ok: false,
      reason: "Impossible de lire cette vidéo. Vérifie qu'elle n'est pas corrompue.",
    };
  }
  if (durationMs > MAX_DURATION_MS) {
    return { ok: false, reason: "Vidéo trop longue (10 min max)." };
  }
  return { ok: true };
}
