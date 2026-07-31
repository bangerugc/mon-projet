import { describe, it, expect, vi, afterEach } from "vitest";
import { requestUploadUrl, uploadToS3 } from "./upload-client";

const file = { name: "clip.mp4", type: "video/mp4", size: 1000 };

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe("requestUploadUrl", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("status ok avec une réponse présignée valide", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, {
        uploadUrl: "https://s3/put",
        key: "uploads/k",
        publicUrl: "https://s3/uploads/k",
      }),
    );
    const r = await requestUploadUrl(file);
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.data.publicUrl).toBe("https://s3/uploads/k");
  });

  it("503 → not_configured (non bloquant)", async () => {
    vi.stubGlobal("fetch", mockFetch(503, { error: "S3 non configuré." }));
    const r = await requestUploadUrl(file);
    expect(r.status).toBe("not_configured");
  });

  it("erreur serveur → error", async () => {
    vi.stubGlobal("fetch", mockFetch(500, { error: "boom" }));
    const r = await requestUploadUrl(file);
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.message).toBe("boom");
  });

  it("fetch qui throw → error réseau", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const r = await requestUploadUrl(file);
    expect(r.status).toBe("error");
  });
});

// XHR minimal contrôlable pour tester uploadToS3 sans réseau.
class FakeXHR {
  static nextStatus = 200;
  upload: { onprogress?: (e: ProgressEvent) => void } = {};
  status = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  open() {}
  setRequestHeader() {}
  send() {
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded: 5,
      total: 10,
    } as ProgressEvent);
    this.status = FakeXHR.nextStatus;
    if (FakeXHR.nextStatus < 0) this.onerror?.();
    else this.onload?.();
  }
}

describe("uploadToS3", () => {
  afterEach(() => vi.unstubAllGlobals());

  const asFile = { type: "video/mp4" } as File;

  it("résout et rapporte la progression sur 2xx", async () => {
    FakeXHR.nextStatus = 200;
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    const progress: number[] = [];
    await expect(
      uploadToS3("https://s3/put", asFile, (f) => progress.push(f)),
    ).resolves.toBeUndefined();
    expect(progress).toContain(0.5);
  });

  it("rejette sur statut HTTP non-2xx", async () => {
    FakeXHR.nextStatus = 403;
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    await expect(uploadToS3("https://s3/put", asFile)).rejects.toThrow(/403/);
  });

  it("rejette sur erreur réseau", async () => {
    FakeXHR.nextStatus = -1;
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    await expect(uploadToS3("https://s3/put", asFile)).rejects.toThrow(/réseau/);
  });
});
