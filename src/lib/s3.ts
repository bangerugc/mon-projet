import { S3Client } from "@aws-sdk/client-s3";

// ─────────────────────────────────────────────────────────────────────────
// s3.ts — configuration S3 lue depuis l'environnement (server-only).
// Renvoie `null` si les variables AWS manquent → l'app reste utilisable en
// dev sans AWS (la preview blob marche, seul l'upload S3 est désactivé).
// Noms de variables = §12.
// ─────────────────────────────────────────────────────────────────────────

export type S3Config = {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export function getS3Config(): S3Config | null {
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_UPLOAD_BUCKET;
  const accessKeyId = process.env.REMOTION_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;
  if (!region || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { region, bucket, accessKeyId, secretAccessKey };
}

export function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/** Nettoie un nom de fichier pour un usage sûr comme clé S3. */
export function sanitizeObjectName(filename: string): string {
  const cleaned = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "video";
}
