import { describe, it, expect } from "vitest";
import {
  msToFrame,
  frameToMs,
  snapMs,
  clampOffset,
  OFFSET_MIN_MS,
  OFFSET_MAX_MS,
} from "./timing";

describe("msToFrame", () => {
  // Cas obligatoires du §6.
  it("1000 ms @ 30 fps = 30", () => expect(msToFrame(1000, 30)).toBe(30));
  it("1016 ms @ 60 fps = 61", () => expect(msToFrame(1016, 60)).toBe(61));
  it("0 ms @ 30 fps = 0", () => expect(msToFrame(0, 30)).toBe(0));

  it("arrondit (round, pas floor)", () => {
    // 500 ms @ 30 fps = 15.0 ; 517 ms @ 30 fps = 15.51 → 16 (floor donnerait 15)
    expect(msToFrame(500, 30)).toBe(15);
    expect(msToFrame(517, 30)).toBe(16);
  });

  it("gère les valeurs négatives sans biais", () => {
    expect(msToFrame(-1000, 30)).toBe(-30);
    expect(msToFrame(-517, 30)).toBe(-16);
  });

  it("supporte 24 / 25 / 60 fps", () => {
    expect(msToFrame(1000, 24)).toBe(24);
    expect(msToFrame(1000, 25)).toBe(25);
    expect(msToFrame(1000, 60)).toBe(60);
  });
});

describe("frameToMs", () => {
  it("est cohérent avec msToFrame sur des frames entières", () => {
    expect(frameToMs(30, 30)).toBe(1000);
    expect(frameToMs(60, 60)).toBe(1000);
    expect(frameToMs(0, 30)).toBe(0);
  });
});

describe("snapMs", () => {
  it("aligne sur 10 ms par défaut", () => {
    expect(snapMs(1004)).toBe(1000);
    expect(snapMs(1005)).toBe(1010);
    expect(snapMs(0)).toBe(0);
  });
  it("gère un pas custom", () => {
    expect(snapMs(123, 50)).toBe(100);
    expect(snapMs(125, 50)).toBe(150);
  });
  it("gère les négatifs", () => {
    expect(snapMs(-1004)).toBe(-1000);
    expect(snapMs(-1006)).toBe(-1010);
  });
  it("no-op si step <= 0", () => {
    expect(snapMs(1234, 0)).toBe(1234);
    expect(snapMs(1234, -10)).toBe(1234);
  });
});

describe("clampOffset", () => {
  it("laisse passer les valeurs dans la plage", () => {
    expect(clampOffset(0)).toBe(0);
    expect(clampOffset(250)).toBe(250);
    expect(clampOffset(-250)).toBe(-250);
  });
  it("clampe aux bornes", () => {
    expect(clampOffset(9999)).toBe(OFFSET_MAX_MS);
    expect(clampOffset(-9999)).toBe(OFFSET_MIN_MS);
  });
});
