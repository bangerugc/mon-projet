import { NextResponse } from "next/server";
import { getLambdaConfig } from "@/lib/render-config";
import { isMockId, mockProgress } from "@/lib/render";

// Progression d'un rendu (polling ~1,5 s côté client). Réel via getRenderProgress
// si Lambda configuré, sinon progression simulée déduite du renderId.
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const config = getLambdaConfig();

  // ── MODE MOCK ──────────────────────────────────────────────────────────
  if (isMockId(id) || !config) {
    const { done, overallProgress } = mockProgress(id, Date.now());
    return NextResponse.json({
      done,
      overallProgress,
      // Fichier de démo servi comme "export" simulé (pas de vrai rendu sans AWS).
      outputUrl: done ? "/sample.webm" : null,
      mock: true,
    });
  }

  // ── MODE RÉEL ────────────────────────────────────────────────────────────
  const bucketName = new URL(request.url).searchParams.get("bucketName");
  if (!bucketName) {
    return NextResponse.json({ error: "bucketName requis." }, { status: 400 });
  }
  try {
    const { getRenderProgress } = await import("@remotion/lambda/client");
    const progress = await getRenderProgress({
      renderId: id,
      bucketName,
      functionName: config.functionName,
      region: config.region as Parameters<typeof getRenderProgress>[0]["region"],
    });
    if (progress.fatalErrorEncountered) {
      return NextResponse.json(
        { error: progress.errors[0]?.message ?? "Le rendu a échoué." },
        { status: 502 },
      );
    }
    return NextResponse.json({
      done: progress.done,
      overallProgress: progress.overallProgress,
      framesRendered: progress.framesRendered ?? 0,
      outputSizeInBytes: progress.outputSizeInBytes ?? null,
      outputUrl: progress.outputFile ?? null,
      mock: false,
    });
  } catch (error) {
    console.error("[render/progress] échec", error);
    return NextResponse.json(
      { error: "Impossible de lire la progression du rendu." },
      { status: 502 },
    );
  }
}
