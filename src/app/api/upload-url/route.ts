import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import { getS3Config, createS3Client, sanitizeObjectName } from "@/lib/s3";
import { validateVideoFile } from "@/lib/upload";

// Route serveur : génère une URL PUT présignée S3. Runtime nodejs (le SDK AWS
// n'est pas compatible edge). Aucun secret n'est renvoyé au client — juste une
// URL signée à durée de vie courte.
export const runtime = "nodejs";

type UploadUrlRequest = {
  filename: string;
  contentType: string;
  size: number;
};

function parseBody(body: unknown): UploadUrlRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (
    typeof b.filename !== "string" ||
    typeof b.contentType !== "string" ||
    typeof b.size !== "number"
  ) {
    return null;
  }
  return { filename: b.filename, contentType: b.contentType, size: b.size };
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json(
      { error: "Champs manquants (filename, contentType, size)." },
      { status: 400 },
    );
  }

  // Revalidation côté serveur (ne jamais faire confiance au client).
  const validation = validateVideoFile({ type: body.contentType, size: body.size });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const config = getS3Config();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Upload S3 non configuré : renseigne AWS_REGION, S3_UPLOAD_BUCKET et les clés AWS dans .env.local.",
      },
      { status: 503 },
    );
  }

  const key = `uploads/${nanoid()}-${sanitizeObjectName(body.filename)}`;

  try {
    const client = createS3Client(config);
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: body.contentType,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });
    const publicUrl = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
    return NextResponse.json({ uploadUrl, key, publicUrl });
  } catch (error) {
    console.error("[upload-url] échec de présignature", error);
    return NextResponse.json(
      { error: "Impossible de préparer l'upload. Réessaie." },
      { status: 500 },
    );
  }
}
