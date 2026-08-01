import { useVideoConfig } from "remotion";
import { msToFrame } from "@/lib/timing";
import { getEntranceAnimation } from "../animations";
import { baseTextStyle, fontPx, strokeStyle } from "./common";
import type { TemplateComponent } from "./types";

// Hormozi 2 — gras italique majuscules, contour noir épais + lueur douce ;
// le mot actif prend `highlightColor` (vert par défaut). Style « Hormozi ».
export const Hormozi2: TemplateComponent = ({
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
        fontStyle: "italic",
        letterSpacing: `${size * 0.005}px`,
        textShadow: `0 ${size * 0.03}px ${size * 0.14}px rgba(0,0,0,0.55)`,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `${size * 0.18}px`,
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
