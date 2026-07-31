import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
  delayRender,
  continueRender,
} from "remotion";
import type { CaptionRenderProps } from "@/lib/types";
import { frameToMs, msToFrame } from "@/lib/timing";
import {
  groupWordsIntoPages,
  getActivePageIndex,
  getActiveWordIndex,
} from "@/lib/captions";
import { loadAllFonts } from "./fonts";
import { TEMPLATES } from "./templates";

// CaptionsComposition — racine du rendu. Reçoit EXACTEMENT le CaptionRenderProps
// du <Player> comme du render Lambda (§3, règle d'or : preview = export).
export const CaptionsComposition: React.FC<CaptionRenderProps> = ({
  videoSrc,
  words,
  style,
  offsetMs,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // §9 : charger les polices AVANT de capturer les frames, sinon la 1re
  // seconde sort en police système. Le render attend `continueRender`.
  const [handle] = useState(() => delayRender("loading-fonts"));
  useEffect(() => {
    loadAllFonts().finally(() => continueRender(handle));
  }, [handle]);

  // Groupement mémoïsé (piège n°10 : ne pas recalculer 800 mots par frame).
  const pages = useMemo(
    () => groupWordsIntoPages(words, style.maxWordsPerLine),
    [words, style.maxWordsPerLine],
  );

  // Décalage de sync : on ajuste le temps des sous-titres, pas la vidéo.
  const adjustedMs = frameToMs(frame, fps) - offsetMs;
  const captionFrame = frame - msToFrame(offsetMs, fps);
  const activePageIndex = getActivePageIndex(pages, adjustedMs);
  const activeWordIndex = getActiveWordIndex(pages, adjustedMs);
  const activePage = activePageIndex >= 0 ? pages[activePageIndex] : undefined;

  const Template = TEMPLATES[style.template].Component;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {videoSrc ? <OffthreadVideo src={videoSrc} /> : null}

      {activePage ? (
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${style.positionY * 100}%`,
              transform: "translateY(-50%)",
              padding: "0 5%",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Template
              page={activePage}
              activeWordIndex={activeWordIndex}
              style={style}
              frame={captionFrame}
              fps={fps}
            />
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
