import { describe, it, expect, afterEach, vi } from "vitest";
import { mockRenderId, isMockId, mockProgress, MOCK_RENDER_MS } from "./render";
import { getLambdaConfig } from "./render-config";

describe("mock render", () => {
  it("mockRenderId encode l'horodatage et isMockId le reconnaît", () => {
    const id = mockRenderId(1000);
    expect(id).toBe("mock-1000");
    expect(isMockId(id)).toBe(true);
    expect(isMockId("abc-123")).toBe(false);
  });

  it("progression 0 au départ, 0.5 à mi-course, done à la fin", () => {
    const id = mockRenderId(0);
    expect(mockProgress(id, 0).overallProgress).toBe(0);
    expect(mockProgress(id, MOCK_RENDER_MS / 2).overallProgress).toBeCloseTo(0.5, 5);
    const end = mockProgress(id, MOCK_RENDER_MS);
    expect(end.overallProgress).toBe(1);
    expect(end.done).toBe(true);
  });

  it("progression clampée dans [0,1]", () => {
    const id = mockRenderId(100);
    expect(mockProgress(id, 0).overallProgress).toBe(0); // avant le départ
    expect(mockProgress(id, 1e9).overallProgress).toBe(1);
  });

  it("id malformé → progression 0", () => {
    expect(mockProgress("mock-abc", 500)).toEqual({ done: false, overallProgress: 0 });
  });
});

describe("getLambdaConfig", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("null si une variable manque", () => {
    vi.stubEnv("AWS_REGION", "eu-central-1");
    vi.stubEnv("REMOTION_FUNCTION_NAME", "");
    vi.stubEnv("REMOTION_SERVE_URL", "https://x/index.html");
    expect(getLambdaConfig()).toBeNull();
  });

  it("config complète quand tout est présent", () => {
    vi.stubEnv("AWS_REGION", "eu-central-1");
    vi.stubEnv("REMOTION_FUNCTION_NAME", "remotion-render-fn");
    vi.stubEnv("REMOTION_SERVE_URL", "https://x/index.html");
    expect(getLambdaConfig()).toEqual({
      region: "eu-central-1",
      functionName: "remotion-render-fn",
      serveUrl: "https://x/index.html",
    });
  });
});
