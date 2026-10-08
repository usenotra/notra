/** Grey shell around metrics and chart, with a 2px rim like every table. */
export const TRAFFIC_HERO_FRAME_CLASS =
  "@container/hero min-w-0 rounded-2xl border border-shell-border bg-shell px-0.5 pb-0.5";

export const TRAFFIC_HERO_METRICS_GRID_CLASS =
  "grid grid-cols-1 @sm/hero:grid-cols-2 @3xl/hero:grid-cols-4";

export const TRAFFIC_HERO_METRICS_SURFACE_CLASS = "pb-5";

export const TRAFFIC_HERO_METRICS_STANDALONE_CLASS = "";

export const TRAFFIC_HERO_CHART_SURFACE_CLASS =
  "border-border bg-card shadow-lift relative -mt-5 rounded-[14px] border p-4";

export const TRAFFIC_HERO_METRIC_CELL_CLASS =
  "border-border flex min-w-0 flex-col gap-2 overflow-hidden border-b px-4 py-4 last:border-b-0 @sm/hero:px-5 @sm/hero:odd:border-r @sm/hero:nth-[n+3]:border-b-0 @3xl/hero:border-r @3xl/hero:border-b-0 @3xl/hero:px-6 @3xl/hero:last:border-r-0";

export const TRAFFIC_HERO_METRIC_VALUE_CLASS =
  "min-w-0 text-2xl leading-none font-semibold tracking-tight tabular-nums @4xl/hero:text-3xl";

export const TRAFFIC_HERO_CHART_OPTIONS = {
  grid: { left: 4, right: 8, top: 8, bottom: 4, containLabel: true },
};

export const TRAFFIC_HERO_TREND_STROKE_WIDTH = 1.5;
