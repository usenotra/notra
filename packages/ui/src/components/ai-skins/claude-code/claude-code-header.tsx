import { cn } from "@notra/ui/lib/utils";
import { useId } from "react";

import { renderClaudeCodeInline } from "./claude-code-inline";

type Cell = [x: number, y: number, width: number, height: number];

const MASCOT_WIDTH = 22;
const MASCOT_HEIGHT = 14;

const MASCOT_BODY: Cell[] = [
  [2, 0, 18, 10],
  [0, 4, 22, 3],
  [3, 10, 2, 4],
  [7, 10, 2, 4],
  [13, 10, 2, 4],
  [17, 10, 2, 4],
];

const MASCOT_EYES: Cell[] = [
  [6, 2, 2, 3],
  [14, 2, 2, 3],
];

export function ClaudeCodeLogo({
  size = 76,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const maskId = useId();

  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0 text-[#e06443]", className)}
      fill="currentColor"
      height={(size * MASCOT_HEIGHT) / MASCOT_WIDTH}
      shapeRendering="crispEdges"
      viewBox={`0 0 ${MASCOT_WIDTH} ${MASCOT_HEIGHT}`}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask id={maskId}>
        {MASCOT_BODY.map(([x, y, w, h]) => (
          <rect fill="white" height={h} key={`${x}-${y}`} width={w} x={x} y={y} />
        ))}
        {MASCOT_EYES.map(([x, y, w, h]) => (
          <rect fill="black" height={h} key={`${x}-${y}`} width={w} x={x} y={y} />
        ))}
      </mask>
      <rect
        height={MASCOT_HEIGHT}
        mask={`url(#${maskId})`}
        width={MASCOT_WIDTH}
      />
    </svg>
  );
}

export function ClaudeCodeHeader({
  version = "v2.1.0",
  model,
  org,
  cwd = "~/",
  tips = [],
  whatsNew = [],
  className,
}: {
  version?: string;
  model?: string;
  org?: string;
  cwd?: string;
  /** Dim `⎿` lines under the notices, like hook output. */
  tips?: string[];
  /** Notice lines under the header. Supports `code` and **bold**. */
  whatsNew?: string[];
  className?: string;
}) {
  const plan = [model, org].filter(Boolean).join(" · ");
  const hasNotices = whatsNew.length > 0 || tips.length > 0;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-5 font-mono text-[13px] leading-5 text-[#f7f7f7]",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-[2ch]">
        <ClaudeCodeLogo />
        <div className="flex min-w-0 flex-col">
          <p className="truncate">
            <span className="font-bold text-white">Claude Code</span>{" "}
            <span className="text-[#8c8c8c]">{version}</span>
          </p>
          {plan ? <p className="truncate text-[#8c8c8c]">{plan}</p> : null}
          {cwd ? <p className="truncate text-[#8c8c8c]">{cwd}</p> : null}
        </div>
      </div>
      {hasNotices ? (
        <div className="flex min-w-0 flex-col pl-[2ch]">
          {whatsNew.map((line) => (
            <p key={line}>{renderClaudeCodeInline(line)}</p>
          ))}
          {tips.map((line) => (
            <p
              className="grid grid-cols-[3ch_minmax(0,1fr)] text-[#8c8c8c]"
              key={line}
            >
              <span aria-hidden="true">⎿</span>
              <span className="min-w-0">{renderClaudeCodeInline(line)}</span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
