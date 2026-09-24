import * as echarts from "echarts/core";

type EChartsInstance = ReturnType<typeof echarts.init>;
type ZrRect = InstanceType<typeof echarts.graphic.Rect>;
type ZrCircle = InstanceType<typeof echarts.graphic.Circle>;

const SCRUB_Z = 110;
const DOT_RADIUS = 4;
const LINE_WIDTH = 1;

/** Opacity of the unclipped trail while scrubbing — original color, faded. */
export const SCRUB_MUTE_OPACITY = 0.3;

export type ScrubDot = {
  x: number;
  y: number;
  color: string;
};

export type ScrubOverlayStore = {
  overlay: { line: ZrRect; dots: ZrCircle[] } | null;
  clips: Map<string, ZrRect>;
};

export type ScrubGrid = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SeriesData = {
  getLayout?: (key: string) => ArrayLike<number> | undefined;
};

type ZrEl = {
  type?: string;
  getPointOn?: (xOrY: number, dim: "x" | "y") => number[] | undefined;
  eachChild?: (cb: (child: ZrEl) => void) => void;
  traverse?: (cb: (el: ZrEl) => void) => void;
};

type SeriesModel = {
  id?: string | number;
  coordinateSystem?: { getArea?: () => ScrubGrid };
  getData?: () => SeriesData;
};

type SeriesView = {
  group?: ZrEl & { setClipPath?: (clip: ZrRect) => void };
};

type ChartInternals = {
  getModel?: () => { getSeries?: () => SeriesModel[] };
  getViewOfSeriesModel?: (model: SeriesModel) => SeriesView | undefined;
};

function internals(chart: EChartsInstance): ChartInternals {
  return chart as unknown as ChartInternals;
}

export function nearestCategoryIndex(raw: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, Math.round(raw)));
}

/** Pixel-space Y on a packed [x0,y0,x1,y1,…] polyline. NaN breaks the segment. */
function yAtXOnPackedPoints(
  packed: ArrayLike<number>,
  x: number
): number | null {
  const n = packed.length;
  if (n < 2) return null;
  let prevX = Number.NaN;
  let prevY = Number.NaN;
  let firstY = Number.NaN;
  for (let i = 0; i < n; i += 2) {
    const px = packed[i];
    const py = packed[i + 1];
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      prevX = Number.NaN;
      prevY = Number.NaN;
      continue;
    }
    if (!Number.isFinite(firstY)) firstY = py;
    if (px === x || (px > x && !Number.isFinite(prevX))) return py;
    if (px > x) {
      const span = px - prevX;
      return span === 0 ? py : prevY + ((x - prevX) / span) * (py - prevY);
    }
    prevX = px;
    prevY = py;
  }
  return Number.isFinite(prevY) ? prevY : Number.isFinite(firstY) ? firstY : null;
}

function findEcPolyline(root: ZrEl | undefined): ZrEl | null {
  if (!root) return null;
  let found: ZrEl | null = null;
  const take = (el: ZrEl) => {
    if (
      !found &&
      el.type === "ec-polyline" &&
      typeof el.getPointOn === "function"
    ) {
      found = el;
    }
  };
  if (typeof root.traverse === "function") {
    root.traverse(take);
    return found;
  }
  const visit = (el: ZrEl) => {
    if (found) return;
    take(el);
    el.eachChild?.(visit);
  };
  visit(root);
  return found;
}

/**
 * Y on the drawn series path at pixel x — ECharts' own polyline (smooth,
 * stacked, scaled). Falls back to a chord through the layout points.
 */
export function pointOnSeriesAtX(
  chart: EChartsInstance,
  seriesId: string,
  x: number
): [number, number] | null {
  const views = internals(chart);
  const model = (views.getModel?.().getSeries?.() ?? []).find(
    (series) => String(series.id ?? "") === seriesId
  );
  if (!model) return null;

  const polyline = findEcPolyline(views.getViewOfSeriesModel?.(model)?.group);
  const onCurve = polyline?.getPointOn?.(x, "x");
  if (onCurve && typeof onCurve[1] === "number" && Number.isFinite(onCurve[1])) {
    return [x, onCurve[1]];
  }

  const packed = model.getData?.().getLayout?.("points");
  if (!packed) return null;
  const y = yAtXOnPackedPoints(packed, x);
  return y == null ? null : [x, y];
}

export function emptyScrubStore(): ScrubOverlayStore {
  return { overlay: null, clips: new Map() };
}

export function readScrubGrid(chart: EChartsInstance): ScrubGrid | null {
  const series = internals(chart).getModel?.().getSeries?.() ?? [];
  for (const model of series) {
    const area = model.coordinateSystem?.getArea?.();
    if (area && area.width > 0 && area.height > 0) return area;
  }
  return null;
}

export function syncScrubOverlay(
  chart: EChartsInstance,
  store: ScrubOverlayStore,
  params: {
    x: number;
    grid: ScrubGrid;
    lineColor: string;
    opacity: number;
    dots: readonly ScrubDot[];
  } | null
) {
  const zr = chart.getZr();
  if (!zr) return;

  if (!params || params.opacity < 0.01) {
    if (store.overlay) {
      zr.remove(store.overlay.line);
      for (const dot of store.overlay.dots) zr.remove(dot);
      store.overlay = null;
    }
    return;
  }

  if (!store.overlay) {
    store.overlay = {
      line: new echarts.graphic.Rect({
        silent: true,
        z: SCRUB_Z,
        shape: { x: 0, y: 0, width: LINE_WIDTH, height: 0 },
      }),
      dots: [],
    };
    zr.add(store.overlay.line);
  }

  const { line, dots } = store.overlay;
  const { x, grid, lineColor, opacity, dots: nextDots } = params;
  line.setShape({
    x: x - LINE_WIDTH / 2,
    y: grid.y,
    width: LINE_WIDTH,
    height: grid.height,
  });
  line.setStyle({
    fill: lineColor,
    opacity,
    shadowBlur: 0,
  });

  while (dots.length < nextDots.length) {
    const circle = new echarts.graphic.Circle({
      silent: true,
      z: SCRUB_Z + 1,
      shape: { cx: 0, cy: 0, r: DOT_RADIUS },
    });
    zr.add(circle);
    dots.push(circle);
  }
  while (dots.length > nextDots.length) {
    const extra = dots.pop();
    if (extra) zr.remove(extra);
  }
  for (const [index, dot] of nextDots.entries()) {
    const circle = dots[index];
    if (!circle) continue;
    circle.setShape({ cx: dot.x, cy: dot.y, r: DOT_RADIUS });
    circle.setStyle({
      fill: dot.color,
      opacity: Math.min(opacity * 3, 1),
      shadowBlur: 0,
    });
  }
}

export function clipSeriesToX(
  chart: EChartsInstance,
  store: ScrubOverlayStore,
  mouseX: number | null,
  skipPrefixes: readonly string[]
) {
  const views = internals(chart);
  const series = views.getModel?.().getSeries?.() ?? [];
  const grid = readScrubGrid(chart);
  if (!grid || !views.getViewOfSeriesModel) return;

  const width =
    mouseX === null
      ? grid.width
      : Math.max(0, Math.min(grid.width, mouseX - grid.x));

  for (const model of series) {
    const id = String(model.id ?? "");
    if (skipPrefixes.some((prefix) => id.startsWith(prefix))) continue;
    const view = views.getViewOfSeriesModel(model);
    if (!view?.group?.setClipPath) continue;
    let clip = store.clips.get(id);
    if (!clip) {
      clip = new echarts.graphic.Rect({
        shape: { x: grid.x, y: grid.y, width, height: grid.height },
      });
      store.clips.set(id, clip);
    } else {
      clip.setShape({
        x: grid.x,
        y: grid.y,
        width,
        height: grid.height,
      });
    }
    view.group.setClipPath(clip);
  }
}

export function clearScrub(
  chart: EChartsInstance,
  store: ScrubOverlayStore,
  skipPrefixes: readonly string[]
) {
  syncScrubOverlay(chart, store, null);
  clipSeriesToX(chart, store, null, skipPrefixes);
}
