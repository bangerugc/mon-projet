import { describe, it, expect } from "vitest";
import { TEMPLATES, applyTemplateDefaults } from "./index";
import { DEFAULT_STYLE } from "@/store/useEditorStore";
import type { TemplateId } from "@/lib/types";

const IDS: TemplateId[] = ["leon", "hormozi2", "ali", "hormozi3", "luke"];

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
    const s = applyTemplateDefaults(DEFAULT_STYLE, "leon");
    expect(s.template).toBe("leon");
    expect(s.uppercase).toBe(true);
    expect(s.font).toBe("komikaAxis");
    expect(s.highlightColor).toBe("#f5511e");
  });

  it("préserve les champs non surchargés (position)", () => {
    const custom = { ...DEFAULT_STYLE, positionY: 0.5 };
    const s = applyTemplateDefaults(custom, "ali");
    expect(s.positionY).toBe(0.5);
    expect(s.template).toBe("ali");
  });
});
