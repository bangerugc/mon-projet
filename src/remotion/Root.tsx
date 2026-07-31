import {
  Composition,
  staticFile,
  type CalculateMetadataFunction,
} from "remotion";
import type { CaptionRenderProps } from "@/lib/types";
import { CaptionsComposition } from "./CaptionsComposition";
import { DEFAULT_STYLE } from "@/store/useEditorStore";
import { DEMO_WORDS } from "@/lib/demo-transcript";

const FALLBACK = { width: 1080, height: 1920, fps: 30, durationInFrames: 300 };

// Lit width/height/fps/durée de la vidéo source pour configurer la composition
// dessus (jamais de dimensions en dur, §10 Phase 4). Fallback si illisible.
const calculateCaptionsMetadata: CalculateMetadataFunction<
  CaptionRenderProps
> = async ({ props }) => {
  if (!props.videoSrc) return FALLBACK;
  try {
    const { getVideoMetadata } = await import("@remotion/media-utils");
    const meta = await getVideoMetadata(props.videoSrc);
    // getVideoMetadata donne width/height/durée mais PAS la fps. On rend à
    // 30 fps (minimum §6) ; upgradable plus tard via @remotion/media-parser
    // pour rendre à la fps source exacte.
    const fps = FALLBACK.fps;
    return {
      width: meta.width,
      height: meta.height,
      fps,
      durationInFrames: Math.max(1, Math.round(meta.durationInSeconds * fps)),
    };
  } catch {
    return FALLBACK;
  }
};

// defaultProps = démo lisible dans `remotion studio` sans configurer d'app.
const DEFAULT_PROPS: CaptionRenderProps = {
  videoSrc: staticFile("sample.webm"),
  words: DEMO_WORDS,
  style: DEFAULT_STYLE,
  offsetMs: 0,
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Captions"
      component={CaptionsComposition}
      calculateMetadata={calculateCaptionsMetadata}
      defaultProps={DEFAULT_PROPS}
      durationInFrames={FALLBACK.durationInFrames}
      fps={FALLBACK.fps}
      width={FALLBACK.width}
      height={FALLBACK.height}
    />
  );
};
