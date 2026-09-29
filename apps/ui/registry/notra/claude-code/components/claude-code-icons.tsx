import type { ReactElement } from "react";

import {
  CLAUDE_CODE_LOGO_BITS,
  CLAUDE_CODE_LOGO_PIXEL_HEIGHT,
} from "../constants/claude-code";
import type { ClaudeCodeLogoProps } from "../types/claude-code";

const LOGO_WIDTH = CLAUDE_CODE_LOGO_BITS[0].length;
const LOGO_HEIGHT =
  CLAUDE_CODE_LOGO_BITS.length * CLAUDE_CODE_LOGO_PIXEL_HEIGHT;

const buildLogoRects = () => {
  const rects: ReactElement[] = [];
  for (const [y, row] of CLAUDE_CODE_LOGO_BITS.entries()) {
    let x = 0;
    while (x < LOGO_WIDTH) {
      if (row[x] === "1") {
        let end = x;
        while (end < LOGO_WIDTH && row[end] === "1") {
          end += 1;
        }
        rects.push(
          <rect
            height={CLAUDE_CODE_LOGO_PIXEL_HEIGHT}
            key={`${x}-${y}`}
            width={end - x}
            x={x}
            y={y * CLAUDE_CODE_LOGO_PIXEL_HEIGHT}
          />
        );
        x = end;
      } else {
        x += 1;
      }
    }
  }
  return rects;
};

const LOGO_RECTS = buildLogoRects();

export const ClaudeCodeLogo = ({
  className,
  scale = 4,
  ...props
}: ClaudeCodeLogoProps) => (
  <svg
    aria-hidden="true"
    className={className}
    data-slot="claude-code-logo"
    fill="currentColor"
    height={LOGO_HEIGHT * scale}
    shapeRendering="crispEdges"
    viewBox={`0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}`}
    width={LOGO_WIDTH * scale}
    {...props}
  >
    {LOGO_RECTS}
  </svg>
);
