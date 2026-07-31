import { NextResponse } from "next/server";
import { getLambdaConfig } from "@/lib/render-config";
import { mockRenderId } from "@/lib/render";
import type { CaptionRenderProps } from "@/lib/types";

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
    const { renderMediaOnLambda } = await import("@remotion/lambda/client");
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: config.region as Parameters<typeof renderMediaOnLambda>[0]["region"],
      functionName: config.functionName,
      serveUrl: config.serveUrl,
      composition: "Captions",
      inputProps,
      codec: "h264",
      imageFormat: "jpeg",
      privacy: "public",
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
