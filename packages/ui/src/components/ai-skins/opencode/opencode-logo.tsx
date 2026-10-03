import {
  OPENCODE_LOGO_CELL,
  OPENCODE_LOGO_ROWS,
} from "@notra/ui/constants/opencode-skin";
import { cn } from "@notra/ui/lib/utils";
import type { OpencodeLogoProps } from "@notra/ui/types/opencode-skin";

const WIDTH = OPENCODE_LOGO_ROWS[0].length * OPENCODE_LOGO_CELL;
const HEIGHT = OPENCODE_LOGO_ROWS.length * OPENCODE_LOGO_CELL;

const CELL_FILL: Record<string, string> = {
  "+": "fill-opencode-tui-logo-fill",
  c: "fill-opencode-tui-logo-code",
  o: "fill-opencode-tui-logo-open",
};

const LOGO_CELLS = OPENCODE_LOGO_ROWS.flatMap((row, y) =>
  [...row].flatMap((cell, x) => {
    const fill = CELL_FILL[cell];
    return fill
      ? [
          {
            className: fill,
            key: `${x}-${y}`,
            x: x * OPENCODE_LOGO_CELL,
            y: y * OPENCODE_LOGO_CELL,
          },
        ]
      : [];
  })
);

export function OpencodeLogo({ className, scale = 1 }: OpencodeLogoProps) {
  return (
    <svg
      aria-label="OpenCode"
      className={cn("block", className)}
      height={HEIGHT * scale}
      role="img"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH * scale}
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
}
