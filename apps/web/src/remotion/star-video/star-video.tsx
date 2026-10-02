import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

import type { StarVideoInputProps } from "../../types/star-video";
import { AvatarCloud } from "./avatar-cloud";
import { Confetti } from "./confetti";
import {
  buildAvatarSlots,
  buildConfetti,
  FONT_FAMILY,
  VIDEO_DURATION_IN_FRAMES,
  VIDEO_WIDTH,
} from "./constants";
import { ensureStarVideoFonts } from "./load-fonts";
import { StarCounter } from "./star-counter";

ensureStarVideoFonts();

const fontFamily = FONT_FAMILY;

function Background({ color }: { color: string }) {
  const frame = useCurrentFrame();
  const shift = interpolate(frame, [0, VIDEO_DURATION_IN_FRAMES], [0, 8], {
    extrapolateRight: "clamp",
  });
  const mid = `color-mix(in srgb, ${color} 45%, #ffffff)`;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #ffffff 0%, #ffffff ${28 + shift}%, ${mid} 76%, ${color} 100%)`,
      }}
    />
  );
}

function RepoPill({ owner, repo }: { owner: string; repo: string }) {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [6, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 46,
        left: "50%",
        transform: `translateX(-50%) translateY(${(1 - enter) * 30}px)`,
        opacity: enter,
        display: "flex",
        alignItems: "center",
        gap: 12,
        maxWidth: VIDEO_WIDTH - 120,
        padding: "14px 30px",
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(15,23,42,0.08)",
        fontFamily,
        fontSize: 30,
        color: "#0f172a",
        boxShadow: "0 1px 6px rgba(15,23,42,0.08)",
      }}
    >
      <svg
        aria-hidden="true"
        fill="#0f172a"
        height={28}
        style={{ flexShrink: 0 }}
        viewBox="0 0 16 16"
        width={28}
      >
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
      <span
        style={{
          color: "#64748b",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
      >
        {owner}
      </span>
      <span style={{ color: "#cbd5e1", flexShrink: 0 }}>/</span>
      <span
        style={{
          fontWeight: 700,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
      >
        {repo}
      </span>
    </div>
  );
}

export function StarVideo({
  owner,
  repo,
  stars,
  avatars,
  backgroundColor,
}: StarVideoInputProps) {
  const namespace = `${owner}/${repo}`;
  const confetti = buildConfetti(namespace);
  const slots = buildAvatarSlots(avatars, namespace);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Background color={backgroundColor} />
      <Confetti pieces={confetti} />
      <AvatarCloud slots={slots} />
      <StarCounter fontFamily={fontFamily} stars={stars} />
      <RepoPill owner={owner} repo={repo} />
    </AbsoluteFill>
  );
}
