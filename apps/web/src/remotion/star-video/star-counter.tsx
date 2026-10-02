import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

import { COUNT_DURATION_IN_FRAMES, COUNT_START_FRAME } from "./constants";

const OUTLINE = [
  "3px 0 #fff",
  "-3px 0 #fff",
  "0 3px #fff",
  "0 -3px #fff",
  "3px 3px #fff",
  "-3px 3px #fff",
  "3px -3px #fff",
  "-3px -3px #fff",
  "2px 3px #fff",
  "-2px 3px #fff",
  "2px -3px #fff",
  "-2px -3px #fff",
].join(", ");

export function StarCounter({
  stars,
  fontFamily,
}: {
  stars: number;
  fontFamily: string;
}) {
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame,
    [COUNT_START_FRAME, COUNT_START_FRAME + COUNT_DURATION_IN_FRAMES],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );
  const displayValue = Math.round(progress * stars).toLocaleString("en-US");
  const charCount = Math.max(stars.toLocaleString("en-US").length, 1);
  const fontSize = Math.min(140, Math.round(880 / charCount));

  const appear = interpolate(
    frame,
    [COUNT_START_FRAME, COUNT_START_FRAME + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight: 800,
          fontSize,
          lineHeight: 1,
          color: "#0f172a",
          letterSpacing: "-0.04em",
          opacity: appear,
          fontVariantNumeric: "tabular-nums",
          textShadow: OUTLINE,
        }}
      >
        {displayValue}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: 10,
          opacity: interpolate(
            frame,
            [COUNT_START_FRAME, COUNT_START_FRAME + 14],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }
          ),
        }}
      >
        <span
          style={{
            fontFamily,
            fontWeight: 600,
            fontSize: 38,
            letterSpacing: "0.42em",
            color: "#334155",
            paddingLeft: "0.42em",
          }}
        >
          STARS
        </span>
      </div>
    </AbsoluteFill>
  );
}
