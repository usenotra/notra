import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import type { ConfettiPiece } from "../../types/star-video";
import { VIDEO_HEIGHT } from "./constants";

const SPAWN_ABOVE = 120;

function Piece({ piece }: { piece: ConfettiPiece }) {
  const frame = useCurrentFrame();

  const cycle = frame / piece.fallDuration + piece.phaseOffset;
  const progress = cycle - Math.floor(cycle);
  const y = interpolate(
    progress,
    [0, 1],
    [-SPAWN_ABOVE, VIDEO_HEIGHT + SPAWN_ABOVE]
  );
  const sway = Math.sin(frame / 18 + piece.startX) * piece.swayAmplitude;
  const rotation = cycle * piece.spin;

  return (
    <div
      style={{
        position: "absolute",
        left: `${piece.startX}%`,
        top: 0,
        width: piece.size,
        height: piece.isCircle ? piece.size : piece.size * 0.5,
        backgroundColor: piece.color,
        borderRadius: piece.isCircle ? "50%" : 2,
        transform: `translate3d(${sway}px, ${y}px, 0) rotate(${rotation}deg)`,
      }}
    />
  );
}

export function Confetti({ pieces }: { pieces: ConfettiPiece[] }) {
  return (
    <AbsoluteFill>
      {pieces.map((piece) => (
        <Piece key={piece.seed} piece={piece} />
      ))}
    </AbsoluteFill>
  );
}
