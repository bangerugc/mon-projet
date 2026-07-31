import { describe, it, expect } from "vitest";
import { cn } from "./utils";

// Smoke test : vérifie que la toolchain Vitest tourne et que `cn`
// (merge de classes Tailwind utilisé partout par shadcn) se comporte bien.
describe("cn", () => {
  it("concatène les classes", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("ignore les valeurs falsy", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("dédoublonne les conflits Tailwind (dernier gagne)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
