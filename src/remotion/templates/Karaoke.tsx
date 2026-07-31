import { useVideoConfig } from "remotion";
import { msToFrame } from "@/lib/timing";
import { getEntranceAnimation } from "../animations";
import { baseTextStyle, fontPx } from "./common";
import type { TemplateComponent } from "./types";

// Karaoke — blanc ; le mot actif reçoit une pastille arrondie de couleur
// `highlightColor` derrière lui. (§8 #2)
export const Karaoke: TemplateComponent = ({
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
        fontWeight: 700,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `${size * 0.2}px`,
        opacity: anim.opacity,
        transform: anim.transform,
        filter: anim.filter,
      }}
    >
      {page.words.map((w, i) => {
        const active = i === activeWordIndex;
        return (
          <span
            key={w.id}
            style={{
              padding: `${size * 0.06}px ${size * 0.18}px`,
              borderRadius: `${size * 0.18}px`,
              backgroundColor: active ? style.highlightColor : "transparent",
              color: active ? "#ffffff" : style.color,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
