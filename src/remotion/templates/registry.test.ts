import { describe, it, expect } from "vitest";
import { TEMPLATES, applyTemplateDefaults } from "./index";
import { DEFAULT_STYLE } from "@/store/useEditorStore";
import type { TemplateId } from "@/lib/types";

const IDS: TemplateId[] = [
  "minimal",
  "karaoke",
  "punch",
  "handwritten",
  "editorial",
];

describe("registry TEMPLATES", () => {
  it("contient les 5 templates avec label + composant + défauts", () => {
    for (const id of IDS) {
      const t = TEMPLATES[id];
      expect(t.label.length).toBeGreaterThan(0);
      expect(typeof t.Component).toBe("function");
      expect(t.defaults).toBeTypeOf("object");
    }
  });
});

describe("applyTemplateDefaults", () => {
  it("applique les défauts du template et fixe le template", () => {
    const s = applyTemplateDefaults(DEFAULT_STYLE, "punch");
    expect(s.template).toBe("punch");
    expect(s.uppercase).toBe(true);
    expect(s.maxWordsPerLine).toBe(2);
    expect(s.font).toBe("komikaAxis");
  });

  it("préserve les champs non surchargés (couleur, position)", () => {
    const custom = { ...DEFAULT_STYLE, color: "#ff0000", positionY: 0.5 };
    const s = applyTemplateDefaults(custom, "editorial");
    expect(s.color).toBe("#ff0000");
    expect(s.positionY).toBe(0.5);
    expect(s.template).toBe("editorial");
  });
});
