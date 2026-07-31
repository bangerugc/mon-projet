import { useVideoConfig } from "remotion";
import { msToFrame } from "@/lib/timing";
import { getEntranceAnimation } from "../animations";
import { baseTextStyle, fontPx } from "./common";
import type { TemplateComponent } from "./types";

// Handwritten — ton chaud, légère rotation (−2°), apparition MOT PAR MOT
// (chaque mot entre à son propre startMs). (§8 #4)
export const Handwritten: TemplateComponent = ({
  page,
  activeWordIndex,
  style,
  frame,
  fps,
}) => {
  const { width } = useVideoConfig();
  const size = fontPx(style.fontSize, width);

  return (
    <div
      style={{
        ...baseTextStyle(style, size),
        fontWeight: 700,
        transform: "rotate(-2deg)",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `${size * 0.24}px`,
      }}
    >
      {page.words.map((w, i) => {
        // Apparition propre à chaque mot → "mot par mot".
        const anim = getEntranceAnimation(
          style.animation,
          frame - msToFrame(w.startMs, fps),
          fps,
        );
        return (
          <span
            key={w.id}
            style={{
              color: i === activeWordIndex ? style.highlightColor : style.color,
              opacity: anim.opacity,
              transform: anim.transform,
              filter: anim.filter,
              display: "inline-block",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
