import { useVideoConfig } from "remotion";
import { msToFrame } from "@/lib/timing";
import { getEntranceAnimation } from "../animations";
import { baseTextStyle, fontPx, strokeStyle } from "./common";
import type { TemplateComponent } from "./types";

// Leon — gras italique majuscules, contour noir ; le mot actif reçoit une
// boîte arrondie de couleur (orange par défaut). Style « Submagic Leon ».
export const Leon: TemplateComponent = ({
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
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `${size * 0.16}px`,
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
              display: "inline-block",
              padding: active ? `${size * 0.04}px ${size * 0.14}px` : undefined,
              borderRadius: `${size * 0.14}px`,
              backgroundColor: active ? style.highlightColor : "transparent",
              color: "#ffffff",
              ...strokeStyle(style, size),
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
