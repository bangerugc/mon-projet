import { useVideoConfig } from "remotion";
import { msToFrame } from "@/lib/timing";
import { getEntranceAnimation } from "../animations";
import { baseTextStyle, fontPx } from "./common";
import type { TemplateComponent } from "./types";

// Minimal — blanc, ombre portée douce, une ligne. Mot actif 100 % d'opacité,
// les autres à 60 %. (§8 #1)
export const Minimal: TemplateComponent = ({
  page,
  activeWordIndex,
  style,
  frame,
  fps,
}) => {
  const { width } = useVideoConfig();
  const size = fontPx(style.fontSize, width);
  const anim = getEntranceAnimation(
    style.animation,
    frame - msToFrame(page.startMs, fps),
    fps,
  );

  return (
    <div
      style={{
        ...baseTextStyle(style, size),
        fontWeight: 600,
        textShadow: "0 2px 10px rgba(0,0,0,0.45)",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `${size * 0.28}px`,
        opacity: anim.opacity,
        transform: anim.transform,
        filter: anim.filter,
      }}
    >
      {page.words.map((w, i) => (
        <span key={w.id} style={{ opacity: i === activeWordIndex ? 1 : 0.6 }}>
          {w.text}
        </span>
      ))}
    </div>
  );
};
