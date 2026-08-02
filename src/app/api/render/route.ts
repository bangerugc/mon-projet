import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getLambdaConfig } from "@/lib/render-config";
import { getS3Config, createS3Client } from "@/lib/s3";
import { mockRenderId } from "@/lib/render";
import type { CaptionRenderProps } from "@/lib/types";

// Durée de vie de l'URL présignée du média source : doit couvrir tout le rendu.
const SOURCE_URL_TTL_S = 2 * 60 * 60; // 2 h

// Nombre de frames rendues par Lambda. Volontairement ÉLEVÉ → PEU de Lambdas
// simultanées par rendu, pour ne pas dépasser la limite de concurrence Lambda
// du compte (comptes AWS récents = quota bas → « Rate Exceeded »). Ex. vidéo
// 3 min @30fps ≈ 5400 frames → ~6 Lambdas. Compromis vitesse/robustesse ; à
// baisser une fois le quota de concurrence augmenté (Service Quotas AWS).
const FRAMES_PER_LAMBDA = 900;

/**
 * Remplace l'URL S3 "publique par la forme" du média source par une URL
 * présignée GET → Lambda lit la vidéo sans que le bucket soit public.
 * Renvoie l'URL inchangée si ce n'est pas notre bucket / S3 non configuré.
 */
async function presignSource(videoSrc: string): Promise<string> {
  const s3 = getS3Config();
  if (!s3 || !videoSrc.includes(`${s3.bucket}.s3.`)) return videoSrc;
  try {
    const key = decodeURIComponent(new URL(videoSrc).pathname.replace(/^\/+/, ""));
    const client = createS3Client(s3);
    return await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: s3.bucket, Key: key }),
      { expiresIn: SOURCE_URL_TTL_S },
    );
  } catch {
    return videoSrc; // en dernier recours, on tente l'URL telle quelle
  }
}

// Lance un rendu. Réel via Remotion Lambda si configuré (§13), sinon MOCK
// (dev sans AWS) : on renvoie un renderId horodaté, la progression est simulée.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: { inputProps?: CaptionRenderProps };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const inputProps = body.inputProps;
  if (!inputProps || typeof inputProps.videoSrc !== "string") {
    return NextResponse.json({ error: "inputProps manquants." }, { status: 400 });
  }

  const config = getLambdaConfig();

  // ── MODE MOCK (pas d'AWS) ──────────────────────────────────────────────
  if (!config) {
    return NextResponse.json({ renderId: mockRenderId(Date.now()), mock: true });
  }

  // ── MODE RÉEL (Remotion Lambda) ────────────────────────────────────────
  // Lambda ne peut pas lire un blob du navigateur → exiger une URL S3 (piège n°3).
  if (inputProps.videoSrc.startsWith("blob:")) {
    return NextResponse.json(
      { error: "videoSrc doit être une URL S3 (https), pas un blob local." },
      { status: 400 },
    );
  }

  try {
    // Lambda lit la source via une URL présignée GET (bucket non public).
    const videoSrc = await presignSource(inputProps.videoSrc);
    const { renderMediaOnLambda } = await import("@remotion/lambda/client");
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: config.region as Parameters<typeof renderMediaOnLambda>[0]["region"],
      functionName: config.functionName,
      serveUrl: config.serveUrl,
      composition: "Captions",
      inputProps: { ...inputProps, videoSrc },
      codec: "h264",
      imageFormat: "jpeg",
      privacy: "public",
      framesPerLambda: FRAMES_PER_LAMBDA,
    });
    return NextResponse.json({ renderId, bucketName, mock: false });
  } catch (error) {
    console.error("[render] échec du lancement Lambda", error);
    return NextResponse.json(
      { error: "Impossible de lancer le rendu Lambda. Vérifie la config AWS." },
      { status: 502 },
    );
  }
}
