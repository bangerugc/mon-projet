import { describe, it, expect, vi, afterEach } from "vitest";
import { transcribeVideo } from "./transcribe-client";

const file = new File([new Uint8Array([1, 2, 3])], "clip.mp4", {
  type: "video/mp4",
});

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

afterEach(() => vi.unstubAllGlobals());

describe("transcribeVideo", () => {
  it("mappe une réponse OK (mots + flags)", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, {
        words: [{ id: "a", text: "salut", startMs: 0, endMs: 300, confidence: null }],
        demo: true,
        empty: false,
      }),
    );
    const r = await transcribeVideo(file);
    expect(r.status).toBe("ok");
    if (r.status === "ok") {
      expect(r.words).toHaveLength(1);
      expect(r.demo).toBe(true);
      expect(r.empty).toBe(false);
    }
  });

  it("réponse silence (0 mot) → empty true", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { words: [], demo: false, empty: true }));
    const r = await transcribeVideo(file);
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.empty).toBe(true);
  });

  it("erreur serveur → status error avec message", async () => {
    vi.stubGlobal("fetch", mockFetch(422, { error: "Aucune piste audio détectée." }));
    const r = await transcribeVideo(file);
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.message).toMatch(/piste audio/);
  });

  it("fetch qui throw → erreur réseau", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const r = await transcribeVideo(file);
    expect(r.status).toBe("error");
  });
});
