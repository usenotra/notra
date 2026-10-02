import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
} from "remotion";

import type { AvatarSlot } from "../../types/star-video";
import { AVATAR_VERT_FACTOR, VIDEO_HEIGHT, VIDEO_WIDTH } from "./constants";

const CENTER_X = VIDEO_WIDTH / 2;
const CENTER_Y = VIDEO_HEIGHT / 2 - 10;
const ORBIT_SPEED = 0.0035;
const ENTRANCE_FRAMES = 16;

function Avatar({ slot }: { slot: AvatarSlot }) {
  const frame = useCurrentFrame();
  const local = frame - slot.appearFrame;

  if (local < 0) {
    return null;
  }

  const entrance = interpolate(local, [0, ENTRANCE_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const orbit = frame * ORBIT_SPEED * slot.orbitDir;
  const angle = slot.angle + orbit;

  const x = CENTER_X + Math.cos(angle) * slot.radius - slot.size / 2;
  const y =
    CENTER_Y +
    Math.sin(angle) * slot.radius * AVATAR_VERT_FACTOR -
    slot.size / 2;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: slot.size,
        height: slot.size,
        borderRadius: "50%",
        overflow: "hidden",
        border: "3px solid #ffffff",
        boxShadow: "0 1px 4px rgba(15, 23, 42, 0.12)",
        opacity: entrance,
        transform: `translate3d(${x}px, ${y}px, 0) scale(${entrance})`,
        backfaceVisibility: "hidden",
        backgroundColor: "#e2e8f0",
      }}
    >
      <Img
        src={slot.url}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

export function AvatarCloud({ slots }: { slots: AvatarSlot[] }) {
  return (
    <AbsoluteFill>
      {slots.map((slot) => (
        <Avatar key={slot.url} slot={slot} />
      ))}
    </AbsoluteFill>
  );
}
