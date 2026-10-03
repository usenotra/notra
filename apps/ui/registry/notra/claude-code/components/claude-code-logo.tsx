import { useId } from "react";

import {
  CLAUDE_CODE_MASCOT_BODY,
  CLAUDE_CODE_MASCOT_EYES,
  CLAUDE_CODE_MASCOT_SIZE,
} from "../constants/claude-code";
import type { ClaudeCodeLogoProps } from "../types/claude-code";

const { height, width } = CLAUDE_CODE_MASCOT_SIZE;

export const ClaudeCodeLogo = ({
  size = 76,
  ...props
}: ClaudeCodeLogoProps) => {
  const maskId = useId();

  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={(size * height) / width}
      shapeRendering="crispEdges"
      viewBox={`0 0 ${width} ${height}`}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <mask id={maskId}>
        {CLAUDE_CODE_MASCOT_BODY.map(([x, y, w, h]) => (
          <rect
            fill="white"
            height={h}
            key={`${x}-${y}`}
            width={w}
            x={x}
            y={y}
          />
        ))}
        {CLAUDE_CODE_MASCOT_EYES.map(([x, y, w, h]) => (
          <rect
            fill="black"
            height={h}
            key={`${x}-${y}`}
            width={w}
            x={x}
            y={y}
          />
        ))}
      </mask>
      <rect height={height} mask={`url(#${maskId})`} width={width} />
    </svg>
  );
};
