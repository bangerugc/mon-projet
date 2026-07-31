import { useVideoConfig } from "remotion";
import { msToFrame } from "@/lib/timing";
import { getEntranceAnimation } from "../animations";
import { baseTextStyle, fontPx, strokeStyle } from "./common";
import type { TemplateComponent } from "./types";

// Punch — majuscules, contour noir épais + ombre dure, mot actif en
// `highlightColor`, scale spring (animation `pop`). (§8 #3)
export const Punch: TemplateComponent = ({
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
        fontWeight: 800,
        letterSpacing: `${size * 0.01}px`,
        textShadow: `${size * 0.04}px ${size * 0.04}px 0 rgba(0,0,0,0.9)`,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `${size * 0.22}px`,
        opacity: anim.opacity,
        transform: anim.transform,
        filter: anim.filter,
        ...strokeStyle(style, size),
      }}
    >
      {page.words.map((w, i) => (
        <span
          key={w.id}
          style={{ color: i === activeWordIndex ? style.highlightColor : style.color }}
        >
          {w.text}
        </span>
      ))}
    </div>
  );
};
