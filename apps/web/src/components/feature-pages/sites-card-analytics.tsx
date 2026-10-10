import { cn } from "@notra/ui/lib/utils";

import {
  SITES_ANALYTICS_AGENTS,
  SITES_ANALYTICS_PEOPLE,
  SITES_ANALYTICS_ROWS,
  SITES_ANALYTICS_TILES,
  SITES_MOCK_SURFACE_CLASS,
} from "@/constants/feature-pages/sites";

const CHART_WIDTH = 320;
const CHART_HEIGHT = 96;
const CHART_MAX = 100;

function toPoints(values: readonly number[]) {
  const step = CHART_WIDTH / (values.length - 1);

  return values
    .map(
      (value, index) =>
        `${(index * step).toFixed(1)},${(CHART_HEIGHT - (value / CHART_MAX) * CHART_HEIGHT).toFixed(1)}`
    )
    .join(" ");
}

const PEOPLE_POINTS = toPoints(SITES_ANALYTICS_PEOPLE);
const AGENT_POINTS = toPoints(SITES_ANALYTICS_AGENTS);

export function SitesCardAnalytics() {
  return (
    <div aria-hidden="true" className={cn(SITES_MOCK_SURFACE_CLASS, "p-4")}>
      <div className="grid grid-cols-2 gap-3">
        {SITES_ANALYTICS_TILES.map((tile, index) => (
          <div
            className="flex flex-col gap-1 rounded-xl border px-4 py-3"
            key={tile.label}
          >
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  "h-0.75 w-3 rounded-full",
                  index === 0 ? "bg-[#8B5CF6]" : "bg-[#E3A15A]"
                )}
              />
              {tile.label}
            </span>
            <span className="font-display text-foreground text-2xl font-semibold tracking-[-0.02em] tabular-nums">
              {tile.value}
            </span>
          </div>
        ))}
      </div>

      <svg
        className="mt-4 h-24 w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      >
        <defs>
          <linearGradient id="sites-people-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          fill="url(#sites-people-fill)"
          points={`0,${CHART_HEIGHT} ${PEOPLE_POINTS} ${CHART_WIDTH},${CHART_HEIGHT}`}
        />
        <polyline
          fill="none"
          points={PEOPLE_POINTS}
          stroke="#8B5CF6"
          strokeLinejoin="round"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          fill="none"
          points={AGENT_POINTS}
          stroke="#E3A15A"
          strokeLinejoin="round"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="mt-4 flex flex-col overflow-clip rounded-xl border">
        {SITES_ANALYTICS_ROWS.map((row) => (
          <div
            className="flex items-center gap-3 border-b px-4 py-2.5 text-[0.8125rem] last:border-b-0"
            key={row.agent}
          >
            <span className="text-foreground font-mono">{row.agent}</span>
            <span className="text-muted-foreground">{row.owner}</span>
            <span className="text-foreground ml-auto font-medium tabular-nums">
              {row.visits}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
