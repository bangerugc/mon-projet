import { useVideoConfig } from "remotion";
import { msToFrame } from "@/lib/timing";
import { getEntranceAnimation } from "../animations";
import { baseTextStyle, fontPx } from "./common";
import type { TemplateComponent } from "./types";

// Ali — texte foncé gras italique posé dans une BOÎTE BLANCHE arrondie (toute
// la ligne). Le mot actif prend `highlightColor`. Style « Ali / clean box ».
export const Ali: TemplateComponent = ({
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
        backgroundColor: "#ffffff",
        borderRadius: `${size * 0.24}px`,
        padding: `${size * 0.12}px ${size * 0.28}px`,
        boxShadow: `0 ${size * 0.04}px ${size * 0.16}px rgba(0,0,0,0.25)`,
        opacity: anim.opacity,
        transform: anim.transform,
        filter: anim.filter,
      }}
    >
      <div
        style={{
          ...baseTextStyle(style, size),
          fontWeight: 700,
          fontStyle: "italic",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: `${size * 0.2}px`,
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
    </div>
  );
};
