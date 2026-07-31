import { describe, it, expect, afterEach, vi } from "vitest";
import { sanitizeObjectName, getS3Config, createS3Client } from "./s3";

describe("getS3Config", () => {
  afterEach(() => vi.unstubAllEnvs());

  const setAll = () => {
    vi.stubEnv("AWS_REGION", "eu-central-1");
    vi.stubEnv("S3_UPLOAD_BUCKET", "bucket-x");
    vi.stubEnv("REMOTION_AWS_ACCESS_KEY_ID", "AKIA_TEST");
    vi.stubEnv("REMOTION_AWS_SECRET_ACCESS_KEY", "secret_test");
  };

  it("renvoie la config quand toutes les variables sont présentes", () => {
    setAll();
    expect(getS3Config()).toEqual({
      region: "eu-central-1",
      bucket: "bucket-x",
      accessKeyId: "AKIA_TEST",
      secretAccessKey: "secret_test",
    });
  });

  it("renvoie null si une variable manque", () => {
    setAll();
    vi.stubEnv("S3_UPLOAD_BUCKET", "");
    expect(getS3Config()).toBeNull();
  });

  it("createS3Client construit un client à partir de la config", () => {
    const client = createS3Client({
      region: "eu-central-1",
      bucket: "b",
      accessKeyId: "a",
      secretAccessKey: "s",
    });
    expect(client).toBeDefined();
    expect(typeof client.send).toBe("function");
  });
});


describe("sanitizeObjectName", () => {
  it("minuscule et remplace les caractères spéciaux par des tirets", () => {
    expect(sanitizeObjectName("Ma Vidéo Finale.mp4")).toBe("ma-vid-o-finale.mp4");
  });
  it("retire les tirets en début/fin", () => {
    expect(sanitizeObjectName("  clip !!.mov  ")).toBe("clip-.mov");
  });
  it("garde les points (extension)", () => {
    expect(sanitizeObjectName("video.webm")).toBe("video.webm");
  });
  it("fallback 'video' si le nom devient vide", () => {
    expect(sanitizeObjectName("###")).toBe("video");
    expect(sanitizeObjectName("")).toBe("video");
  });
});
