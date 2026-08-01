import { useVideoConfig } from "remotion";
import { msToFrame } from "@/lib/timing";
import { getEntranceAnimation } from "../animations";
import { baseTextStyle, fontPx, strokeStyle } from "./common";
import type { TemplateComponent } from "./types";

// Hormozi 3 — gras majuscules blanc, contour noir + ombre portée DURE (offset,
// sans flou) ; mot actif en `highlightColor` (jaune par défaut).
export const Hormozi3: TemplateComponent = ({
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
        textShadow: `${size * 0.045}px ${size * 0.045}px 0 rgba(0,0,0,0.9)`,
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
