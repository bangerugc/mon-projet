import { describe, it, expect } from "vitest";
import { getEntranceAnimation } from "./animations";

const FPS = 30; // durée d'entrée = round(30*0.2) = 6 frames

describe("getEntranceAnimation", () => {
  it("none : toujours visible, même avant l'apparition", () => {
    expect(getEntranceAnimation("none", -10, FPS)).toEqual({
      opacity: 1,
      transform: "none",
      filter: "none",
    });
  });

  it("avant apparition (localFrame<0) : opacité 0 (sauf none)", () => {
    expect(getEntranceAnimation("fade", -1, FPS).opacity).toBe(0);
    expect(getEntranceAnimation("blur", -5, FPS).opacity).toBe(0);
  });

  it("fade : 0 au départ, 1 une fois l'entrée finie", () => {
    expect(getEntranceAnimation("fade", 0, FPS).opacity).toBe(0);
    expect(getEntranceAnimation("fade", 6, FPS).opacity).toBe(1);
    expect(getEntranceAnimation("fade", 100, FPS).opacity).toBe(1);
    const mid = getEntranceAnimation("fade", 3, FPS).opacity;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it("pop : applique un scale, opacité pleine à la fin", () => {
    expect(getEntranceAnimation("pop", 3, FPS).transform).toMatch(/scale\(/);
    expect(getEntranceAnimation("pop", 6, FPS).opacity).toBe(1);
  });

  it("rise : translateY qui tend vers 0", () => {
    expect(getEntranceAnimation("rise", 1, FPS).transform).toMatch(/translateY\(/);
    expect(getEntranceAnimation("rise", 6, FPS).transform).toBe("translateY(0em)");
  });

  it("blur : filtre blur qui tend vers 0", () => {
    expect(getEntranceAnimation("blur", 1, FPS).filter).toMatch(/blur\(/);
    expect(getEntranceAnimation("blur", 6, FPS).filter).toBe("blur(0px)");
  });
});
