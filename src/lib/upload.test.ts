import { describe, it, expect } from "vitest";
import {
  validateVideoFile,
  validateVideoDurationMs,
  MAX_UPLOAD_BYTES,
  MAX_DURATION_MS,
} from "./upload";

describe("validateVideoFile", () => {
  it("accepte MP4 / MOV / WebM de taille correcte", () => {
    expect(validateVideoFile({ type: "video/mp4", size: 1000 }).ok).toBe(true);
    expect(validateVideoFile({ type: "video/quicktime", size: 1000 }).ok).toBe(true);
    expect(validateVideoFile({ type: "video/webm", size: 1000 }).ok).toBe(true);
  });

  it("refuse un type non supporté (ex. PDF renommé)", () => {
    const r = validateVideoFile({ type: "application/pdf", size: 1000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Format non supporté/);
  });

  it("refuse au-delà de 200 Mo", () => {
    const r = validateVideoFile({ type: "video/mp4", size: MAX_UPLOAD_BYTES + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/trop lourde/);
  });

  it("accepte pile à la limite de taille", () => {
    expect(validateVideoFile({ type: "video/mp4", size: MAX_UPLOAD_BYTES }).ok).toBe(true);
  });

  it("refuse un fichier vide", () => {
    expect(validateVideoFile({ type: "video/mp4", size: 0 }).ok).toBe(false);
  });
});

describe("validateVideoDurationMs", () => {
  it("accepte une durée normale", () => {
    expect(validateVideoDurationMs(60_000).ok).toBe(true);
  });
  it("accepte pile 10 min", () => {
    expect(validateVideoDurationMs(MAX_DURATION_MS).ok).toBe(true);
  });
  it("refuse au-delà de 10 min", () => {
    const r = validateVideoDurationMs(MAX_DURATION_MS + 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/trop longue/);
  });
  it("refuse une durée illisible (0, NaN, Infinity)", () => {
    expect(validateVideoDurationMs(0).ok).toBe(false);
    expect(validateVideoDurationMs(NaN).ok).toBe(false);
    expect(validateVideoDurationMs(Infinity).ok).toBe(false);
  });
});
