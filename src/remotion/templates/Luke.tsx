import { useVideoConfig } from "remotion";
import { msToFrame } from "@/lib/timing";
import { getEntranceAnimation } from "../animations";
import { baseTextStyle, fontPx } from "./common";
import type { TemplateComponent } from "./types";

// Luke — ton chaud/crème, gras italique majuscules, ombre douce ; le mot actif
// passe en blanc (`highlightColor`). Style « Luke », calme et premium.
export const Luke: TemplateComponent = ({
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
        fontStyle: "italic",
        letterSpacing: `${size * 0.01}px`,
        textShadow: `0 ${size * 0.02}px ${size * 0.1}px rgba(0,0,0,0.45)`,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `${size * 0.2}px`,
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
