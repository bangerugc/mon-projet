// ─────────────────────────────────────────────────────────────────────────
// render.ts — helpers PURS pour l'export.
// En l'absence d'AWS, /api/render tourne en mode MOCK : le renderId encode
// l'horodatage de départ, et la progression se déduit du temps écoulé
// (aucun état serveur à conserver → marche même en serverless).
// ─────────────────────────────────────────────────────────────────────────

export const MOCK_RENDER_MS = 1500;
const MOCK_PREFIX = "mock-";

export function mockRenderId(nowMs: number): string {
  return `${MOCK_PREFIX}${nowMs}`;
}

export function isMockId(id: string): boolean {
  return id.startsWith(MOCK_PREFIX);
}

export type RenderProgress = {
  done: boolean;
  overallProgress: number; // 0 → 1
};

/** Progression simulée déduite du renderId (horodatage) et de l'instant courant. */
export function mockProgress(id: string, nowMs: number): RenderProgress {
  const start = Number(id.slice(MOCK_PREFIX.length));
  if (!Number.isFinite(start)) return { done: false, overallProgress: 0 };
  const elapsed = nowMs - start;
  const overallProgress = Math.min(1, Math.max(0, elapsed / MOCK_RENDER_MS));
  return { done: overallProgress >= 1, overallProgress };
}
