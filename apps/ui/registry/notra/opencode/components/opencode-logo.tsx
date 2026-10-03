import { cn } from "cn";

import { OPENCODE_LOGO_CELL, OPENCODE_LOGO_ROWS } from "../constants/opencode";
import type { OpencodeLogoProps } from "../types/opencode";

const COLUMNS = OPENCODE_LOGO_ROWS[0].length;
const WIDTH = COLUMNS * OPENCODE_LOGO_CELL;
const HEIGHT = OPENCODE_LOGO_ROWS.length * OPENCODE_LOGO_CELL;

const CELL_FILL: Record<string, string> = {
  "+": "fill-opencode-logo-fill",
  c: "fill-opencode-logo-code",
  o: "fill-opencode-logo-open",
};

const LOGO_CELLS = OPENCODE_LOGO_ROWS.flatMap((row, y) =>
  [...row].flatMap((cell, x) =>
    cell in CELL_FILL
      ? [
          {
            className: CELL_FILL[cell],
            key: `${x}-${y}`,
            x: x * OPENCODE_LOGO_CELL,
            y: y * OPENCODE_LOGO_CELL,
          },
        ]
      : []
  )
);

export const OpencodeLogo = ({
  "aria-label": ariaLabel = "OpenCode",
  className,
  scale = 1,
  ...props
}: OpencodeLogoProps) => (
  <svg
    aria-label={ariaLabel}
    className={cn("block", className)}
    data-slot="opencode-logo"
    height={HEIGHT * scale}
    role="img"
    shapeRendering="crispEdges"
    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    width={WIDTH * scale}
    {...props}
  >
    {LOGO_CELLS.map((cell) => (
      <rect
        className={cell.className}
        height={OPENCODE_LOGO_CELL}
        key={cell.key}
        width={OPENCODE_LOGO_CELL}
        x={cell.x}
        y={cell.y}
      />
    ))}
  </svg>
);
