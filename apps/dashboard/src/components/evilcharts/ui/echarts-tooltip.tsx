import type { TooltipComponentOption } from "echarts/components";
import {
  getColorsCount,
  indicatorBackground,
  resolvedIndicatorBackground,
  type ResolvedColors,
} from "@/components/evilcharts/ui/echarts-chart";
import type {
  ChartConfig,
  TooltipBodyGroup,
  TooltipBodyItem,
  TooltipLayout,
  TooltipValueFormatter,
} from "@/types/charts";
import {
  fixedTooltipPosition,
  overflowTooltipPosition,
} from "@/utils/chart-tooltip-position";
import { echartsDatumValue } from "@/utils/echarts-datum";

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip — the shared HTML shell/row primitives and the chart-agnostic option
// fields. The tooltip DOM lives inside `[data-chart={id}]`, so the injected
// `--color-*` vars and Tailwind classes resolve directly (no color read). Each
// chart composes its own rows but shares the shell/styling and base option.
// ─────────────────────────────────────────────────────────────────────────────

export type TooltipVariant = "default" | "frosted-glass";
export type TooltipRoundness = "sm" | "md" | "lg" | "xl";
// Tooltip anchoring: "variable" follows both axes (ECharts default, current
// behavior); "fixed" sits beside the pointer's X so the hover line stays
// visible, and stays pinned near the top (fixed Y).
export type TooltipPosition = "fixed" | "variable";
export type TooltipAxisPointer = "none" | "line" | "shadow" | "cross";

// Hover motion — the cursor line snaps to the hovered category (an eased line
// trails the pointer and smears); the tooltip box and its bars get a short
// ease so values do not pop.
export const TOOLTIP_MOVE_DURATION_S = 0.16;
const TOOLTIP_MOVE_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
export const TOOLTIP_BAR_MOTION_STYLE = `transition:width ${TOOLTIP_MOVE_DURATION_S}s ${TOOLTIP_MOVE_EASING}`;
export const TOOLTIP_VALUE_MOTION_STYLE =
  "transition:opacity 0.24s ease,transform 0.24s ease";

const HTML_ESCAPE_PATTERN = /[&<>"']/g;
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Tooltip markup is injected as an HTML string by ECharts, so every
// user-derived string (series labels, axis labels, formatted values) must be
// escaped before interpolation — competitor names etc. come from user/LLM input.
export function escapeHtml(value: string): string {
  return value.replace(HTML_ESCAPE_PATTERN, (char) => HTML_ESCAPES[char] ?? char);
}

export const roundnessClass: Record<TooltipRoundness, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

export const tooltipVariantClass: Record<TooltipVariant, string> = {
  default: "bg-popover",
  "frosted-glass": "bg-popover/70 backdrop-blur-md",
};

// The standard series indicator swatch — a rounded square filled with the
// series' solid var or multi-stop gradient (indicatorBackground). A chart drops
// this into a tooltipRow's `indicatorHtml`.
export function tooltipIndicatorHtml(key: string, colorsCount: number): string {
  return `<div class="h-2.5 w-2.5 shrink-0 rounded-[2px]" style="background:${indicatorBackground(key, colorsCount)}"></div>`;
}

/** Swatch for tooltips mounted outside `[data-chart]`, where series CSS vars do not resolve. */
export function tooltipColorSwatchHtml(color: string): string {
  return `<div class="h-2.5 w-2.5 shrink-0 rounded-[2px]" style="background:${escapeHtml(color)}"></div>`;
}

// One tooltip row: indicator swatch + label/value pair. `dimmed` is a class
// fragment (e.g. " opacity-30") appended to the row so the selection/hover dim
// stays byte-identical to the inlined markup.
export function tooltipRow({
  indicatorHtml,
  labelText,
  valueText,
  dimmed,
}: {
  indicatorHtml: string;
  labelText: string;
  valueText: string;
  dimmed: string;
}): string {
  return `<div class="flex w-full flex-wrap items-center gap-2${dimmed}">
          ${indicatorHtml}
          <div class="flex flex-1 items-center justify-between gap-4 leading-none">
            <span class="text-muted-foreground">${escapeHtml(labelText)}</span>
            <span class="text-foreground font-mono font-medium tabular-nums">${escapeHtml(valueText)}</span>
          </div>
        </div>`;
}

const TOOLTIP_BAR_TRACK = 100;
const TOOLTIP_BAR_MIN = 2;

// Shared flat track + fill for every bar-style tooltip row.
const TOOLTIP_BAR_TRACK_CLASS = "h-1 overflow-hidden rounded-full bg-muted";
const TOOLTIP_BAR_FILL_CLASS = "ec-tooltip-bar-fill h-full rounded-full";

export function formatTooltipValue(
  value: unknown,
  formatter?: TooltipValueFormatter
): { numeric: number | null; text: string } {
  const numeric = echartsDatumValue(value);
  if (numeric !== null) {
    return {
      numeric,
      text: formatter ? formatter(numeric) : numeric.toLocaleString(),
    };
  }
  if (value === null || value === undefined) {
    return { numeric: null, text: "" };
  }
  return { numeric: null, text: String(value) };
}

export function tooltipBarWidth(value: number, max: number): number {
  if (value <= 0 || max <= 0) {
    return 0;
  }
  return Math.min(
    TOOLTIP_BAR_TRACK,
    Math.max(
      Math.round((value / max) * TOOLTIP_BAR_TRACK),
      TOOLTIP_BAR_MIN
    )
  );
}

export function configIndicatorHtml(
  item: { indicatorHtml?: string } | undefined
): string | undefined {
  const html = item?.indicatorHtml;
  return typeof html === "string" && html.length > 0 ? html : undefined;
}

export function tooltipBarRow({
  key,
  colorsCount,
  labelText,
  valueText,
  widthPercent,
  dimmed,
  indicatorHtml,
  paint,
}: {
  key: string;
  colorsCount: number;
  labelText: string;
  valueText: string;
  widthPercent: number;
  dimmed: string;
  indicatorHtml?: string;
  paint?: string;
}): string {
  const fill = paint ?? indicatorBackground(key, colorsCount);
  const barFill = escapeHtml(fill);
  const indicator = indicatorHtml ?? tooltipColorSwatchHtml(fill);
  return `<div class="grid w-full grid-cols-[0.875rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1${dimmed}">
          <span class="flex size-3.5 items-center justify-center">${indicator}</span>
          <span class="truncate text-foreground leading-none">${escapeHtml(labelText)}</span>
          <span class="font-mono text-muted-foreground tabular-nums leading-none" style="${TOOLTIP_VALUE_MOTION_STYLE}">${escapeHtml(valueText)}</span>
          <div class="col-span-2 col-start-2 ${TOOLTIP_BAR_TRACK_CLASS}">
            <div class="${TOOLTIP_BAR_FILL_CLASS}" style="width:${widthPercent}%;background:${barFill};${TOOLTIP_BAR_MOTION_STYLE}"></div>
          </div>
        </div>`;
}

export function tooltipItemsFromRow(
  row: Record<string, unknown> | undefined,
  keys: readonly string[],
  config: ChartConfig,
  valueFormatter?: TooltipValueFormatter,
  seriesSlots?: ResolvedColors["series"],
  hideZeros = true
): TooltipBodyItem[] {
  if (!row) {
    return [];
  }
  const items: TooltipBodyItem[] = [];
  for (const key of keys) {
    const raw = row[key];
    if (
      typeof raw !== "number" ||
      !Number.isFinite(raw) ||
      (hideZeros && raw <= 0)
    ) {
      continue;
    }
    const item = config[key];
    const formatted = formatTooltipValue(raw, valueFormatter);
    const slots = seriesSlots?.[key];
    items.push({
      key,
      colorsCount: item ? getColorsCount(item) : 1,
      labelText: typeof item?.label === "string" ? item.label : key,
      value: formatted.numeric,
      valueText: formatted.text,
      dimmed: "",
      indicatorHtml: configIndicatorHtml(item),
      paint: slots ? resolvedIndicatorBackground(slots) : undefined,
    });
  }
  return items;
}

export function tooltipEmptyBody(label: string): string {
  return `<span class="text-muted-foreground">${escapeHtml(label)}</span>`;
}

function tooltipActivityRow(item: TooltipBodyItem, max: number): string {
  const indicatorHtml =
    item.indicatorHtml ??
    (item.paint
      ? tooltipColorSwatchHtml(item.paint)
      : tooltipIndicatorHtml(item.key, item.colorsCount));
  const width = tooltipBarWidth(item.value ?? 0, max);
  return `<div class="relative grid h-7 grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-md bg-muted/40${item.dimmed}">
          <span class="absolute inset-y-0 left-0 bg-foreground/[0.08]" style="width:${width}%;${TOOLTIP_BAR_MOTION_STYLE}"></span>
          <span class="relative flex min-w-0 items-center gap-2 px-2 text-foreground">${indicatorHtml}<span class="truncate">${escapeHtml(item.labelText)}</span></span>
          <span class="relative flex min-w-9 items-center justify-end px-2 font-mono text-muted-foreground tabular-nums" style="${TOOLTIP_VALUE_MOTION_STYLE}">${escapeHtml(item.valueText)}</span>
        </div>`;
}

function tooltipActivityBody(items: readonly TooltipBodyItem[]): string {
  const ranked = [...items].sort(
    (left, right) => (right.value ?? -1) - (left.value ?? -1)
  );
  const total = ranked.reduce((sum, item) => sum + (item.value ?? 0), 0);
  return ranked.map((item) => tooltipActivityRow(item, total)).join("");
}

export function composeTooltipBody(
  items: readonly TooltipBodyItem[],
  layout: TooltipLayout,
  barMax?: number
): string {
  if (layout === "activity") {
    return tooltipActivityBody(items);
  }
  if (layout === "rows") {
    return items
      .map((item) =>
        tooltipRow({
          // `paint` is the resolved color/gradient; prefer it over the
          // `var(--color-*)` swatch, which only resolves while the tooltip DOM
          // lives inside `[data-chart]` (appendTo:"body" tooltips do not).
          indicatorHtml:
            item.indicatorHtml ??
            (item.paint
              ? tooltipColorSwatchHtml(item.paint)
              : tooltipIndicatorHtml(item.key, item.colorsCount)),
          labelText: item.labelText,
          valueText: item.valueText,
          dimmed: item.dimmed,
        })
      )
      .join("");
  }

  let max = barMax ?? 0;
  if (barMax === undefined) {
    for (const item of items) {
      if (item.value !== null && item.value > max) {
        max = item.value;
      }
    }
  }

  const ranked = [...items];
  ranked.sort((left, right) => (right.value ?? -1) - (left.value ?? -1));
  return ranked
    .map((item) =>
      tooltipBarRow({
        key: item.key,
        colorsCount: item.colorsCount,
        labelText: item.labelText,
        valueText: item.valueText,
        widthPercent: tooltipBarWidth(item.value ?? 0, max),
        dimmed: item.dimmed,
        indicatorHtml: item.indicatorHtml,
        paint: item.paint,
      })
    )
    .join("");
}

// The outer tooltip surface — border, padding, shadow, roundness + variant
// classes — wrapping the axis label and the composed rows.
export function tooltipShell({
  label,
  body,
  roundness,
  variant,
  layout = "rows",
}: {
  label: string;
  body: string;
  roundness: TooltipRoundness;
  variant: TooltipVariant;
  layout?: TooltipLayout;
}): string {
  const isRows = layout === "rows";
  const header =
    label.length > 0
      ? `<div class="text-[11px] font-medium text-muted-foreground">${escapeHtml(label)}</div>`
      : "";
  const surface = isRows
    ? "min-w-32 gap-1.5 px-2.5 py-2"
    : "min-w-52 gap-2 px-3 py-2.5";
  const bodyGap =
    layout === "activity" ? "gap-1" : isRows ? "gap-1.5" : "gap-2";
  return `<div class="grid ${surface} items-start border border-border ${tooltipVariantClass[variant]} text-xs shadow-md ${roundnessClass[roundness]}">
      ${header}
      <div class="grid ${bodyGap}" style="transition:opacity 0.24s ease">${body}</div>
    </div>`;
}

// Maps the TooltipPosition prop onto the ECharts tooltip `position` field.
// "variable" + confine → undefined (ECharts default, stays inside the chart).
// "variable" without confine → follow the pointer, clamp X so a left-edge flip
// cannot paint outside the chart. Pair with appendTo:"body" so overflow-hidden
// ancestors (sheet cards, rounded groups) cannot clip the box.
// "fixed" → sit beside the pointer's X (right, or left if it does not fit),
// pin near the top, still clamp X so the hover line stays visible.
export function resolveTooltipPosition(
  position: TooltipPosition,
  confine = true
): TooltipComponentOption["position"] {
  if (position === "fixed") {
    return (point, _params, _dom, _rect, size) =>
      fixedTooltipPosition(point[0], size.contentSize[0], size.viewSize[0]);
  }
  if (confine) {
    return undefined;
  }
  return (point, _params, _dom, _rect, size) =>
    overflowTooltipPosition(
      [point[0], point[1]],
      [size.contentSize[0], size.contentSize[1]],
      [size.viewSize[0], size.viewSize[1]]
    );
}

// The chart-agnostic tooltip option fields (show, trigger, confine,
// background/border/padding/extraCssText, axisPointer, position). The chart
// supplies only `formatter` and spreads this in. `axisPointerColor` is the
// pre-resolved cursor-line color, so this helper needs no live token read.
export function tooltipBaseOption(params: {
  present: boolean;
  cursor: boolean;
  tokens: ResolvedColors["tokens"];
  position: TooltipPosition;
  axisPointerColor: string;
  strokeWidth: number;
  crosshair?: boolean;
  confine?: boolean;
  pointer?: TooltipAxisPointer;
}): TooltipComponentOption {
  const {
    present,
    cursor,
    position,
    axisPointerColor,
    strokeWidth,
    crosshair,
    confine = true,
    pointer = cursor ? (crosshair ? "cross" : "line") : "none",
  } = params;

  const linePointer = {
    type: pointer === "cross" ? ("cross" as const) : ("line" as const),
    animation: false,
    label: { show: false },
    lineStyle: {
      color: axisPointerColor,
      width: strokeWidth,
      type: "solid" as const,
      shadowBlur: 0,
    },
    crossStyle: {
      color: axisPointerColor,
      width: strokeWidth,
      type: "solid" as const,
      shadowBlur: 0,
    },
  };

  // Custom `position` normally disables ECharts' transform transition — keep
  // a short one so the box settles instead of teleporting.
  const tooltipMotionCss = `box-shadow:none;pointer-events:none;will-change:transform;transition:transform ${TOOLTIP_MOVE_DURATION_S}s ${TOOLTIP_MOVE_EASING},opacity 0.28s ease;`;

  return {
    show: present,
    trigger: "axis",
    confine,
    enterable: false,
    showDelay: 0,
    hideDelay: 80,
    transitionDuration: TOOLTIP_MOVE_DURATION_S,
    // Sparklines sit in overflow-hidden cards; appending to body is what
    // actually lets confine:false paint above a 40–48px plot.
    ...(confine ? {} : { appendTo: "body" as const }),
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    extraCssText: tooltipMotionCss,
    axisPointer:
      pointer === "none"
        ? { type: "none" }
        : pointer === "shadow"
          ? {
              type: "shadow",
              shadowStyle: { color: axisPointerColor },
            }
          : linePointer,
    position: resolveTooltipPosition(position, confine),
  };
}

// Sectioned activity list: each group renders a heading (swatch, label, total)
// followed by activity rows scaled to the heading value, so children read as
// shares of it — the same rows the single-group "activity" layout uses.
export function composeTooltipGroupedBody(
  groups: readonly TooltipBodyGroup[]
): string {
  return groups
    .map((group, index) => {
      const headingValue = group.heading.value ?? 0;
      const rows = group.items.toSorted(
        (left, right) => (right.value ?? -1) - (left.value ?? -1)
      );
      const headingHtml = tooltipGroupHeadingRow({
        key: group.heading.key,
        colorsCount: group.heading.colorsCount,
        labelText: group.heading.labelText,
        valueText: group.heading.valueText,
        paint: group.heading.paint,
      });
      const rowsHtml = rows
        .map((item) => tooltipActivityRow(item, headingValue))
        .join("");
      const separator =
        index > 0
          ? `<div class="border-border my-1 border-t" role="separator"></div>`
          : "";
      return `${separator}<div class="grid gap-1">
          ${headingHtml}
          ${rowsHtml}
        </div>`;
    })
    .join("");
}

function tooltipGroupHeadingRow({
  key,
  colorsCount,
  labelText,
  valueText,
  paint,
}: {
  key: string;
  colorsCount: number;
  labelText: string;
  valueText: string;
  paint?: string;
}): string {
  const fill = paint ?? indicatorBackground(key, colorsCount);
  return `<div class="grid h-7 grid-cols-[minmax(0,1fr)_auto] items-center">
          <span class="flex min-w-0 items-center gap-2 px-2 font-medium text-foreground">${tooltipColorSwatchHtml(fill)}<span class="truncate">${escapeHtml(labelText)}</span></span>
          <span class="flex min-w-9 items-center justify-end px-2 font-mono font-semibold text-foreground tabular-nums" style="${TOOLTIP_VALUE_MOTION_STYLE}">${escapeHtml(valueText)}</span>
        </div>`;
}
