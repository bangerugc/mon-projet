import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { getS3Config, createS3Client, sanitizeObjectName } from "@/lib/s3";
import { validateVideoFile } from "@/lib/upload";

// Upload de la vidéo source vers S3 VIA LE SERVEUR (multipart). On ne fait pas
// de PUT présigné direct navigateur→S3 car cela impose un CORS sur le bucket
// (droits IAM non garantis). Le serveur a déjà les credentials → PutObject
// direct, aucun CORS requis. La vidéo n'est PAS rendue publique : le rendu
// Lambda la lira via une URL présignée GET (voir /api/render).
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
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

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }

  // Revalidation serveur (ne jamais faire confiance au client).
  const validation = validateVideoFile({ type: file.type, size: file.size });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const key = `uploads/${nanoid()}-${sanitizeObjectName(file.name || "video.mp4")}`;
  try {
    const client = createS3Client(config);
    const bytes = Buffer.from(await file.arrayBuffer());
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: bytes,
        ContentType: file.type || "video/mp4",
      }),
    );
    // URL "publique" par forme (sert d'identifiant) — l'objet n'est PAS public :
    // /api/render présigne un GET à partir de cette clé pour le rendu Lambda.
    const publicUrl = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
    return NextResponse.json({ key, publicUrl });
  } catch (error) {
    console.error("[upload] échec de l'upload S3", error);
    return NextResponse.json(
      { error: "Upload S3 échoué. Réessaie." },
      { status: 502 },
    );
  }
}
