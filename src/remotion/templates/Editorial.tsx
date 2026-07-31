import { useVideoConfig } from "remotion";
import { msToFrame } from "@/lib/timing";
import { getEntranceAnimation } from "../animations";
import { baseTextStyle, fontPx } from "./common";
import type { TemplateComponent } from "./types";

// Editorial — casse normale, letter-spacing léger, aucun contour, très calme
// (animation `blur`). Le placement en ligne basse est géré par la composition
// via positionY. (§8 #5)
export const Editorial: TemplateComponent = ({
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
        fontWeight: 500,
        letterSpacing: `${size * 0.02}px`,
        textShadow: "0 1px 6px rgba(0,0,0,0.35)",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `${size * 0.26}px`,
        opacity: anim.opacity,
        transform: anim.transform,
        filter: anim.filter,
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
