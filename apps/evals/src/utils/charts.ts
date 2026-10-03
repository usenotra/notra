const EIGHTHS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"] as const;
const SPARK = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;
const SHADES = [" ", "░", "▒", "▓", "█"] as const;

/** Horizontal bar with 1/8 cell resolution. */
export function bar(fraction: number, width: number): string {
  const clamped = Math.max(0, Math.min(1, fraction));
  const eighths = Math.round(clamped * width * 8);
  const full = Math.floor(eighths / 8);
  const rest = eighths % 8;
  return "█".repeat(full) + (EIGHTHS[rest] ?? "");
}

export function sparkline(values: readonly number[], width: number): string {
  if (values.length === 0) {
    return "";
  }
  const slice = values.slice(-width);
  const max = Math.max(...slice);
  const min = Math.min(...slice);
  const span = max - min || 1;
  return slice
    .map((value) => SPARK[Math.round(((value - min) / span) * 7)] ?? "▁")
    .join("");
}

/** Bucketed distribution (e.g. latency histogram) as one line of blocks. */
export function histogram(
  values: readonly number[],
  buckets: number,
  maxValue?: number
): { line: string; max: number } {
  if (values.length === 0) {
    return { line: " ".repeat(buckets), max: 0 };
  }
  const top = maxValue ?? Math.max(...values);
  const counts = new Array<number>(buckets).fill(0);
  for (const value of values) {
    const index = Math.min(
      buckets - 1,
      Math.floor((value / (top || 1)) * buckets)
    );
    counts[index] = (counts[index] ?? 0) + 1;
  }
  const peak = Math.max(...counts);
  const line = counts
    .map((count) =>
      count === 0 ? " " : (SPARK[Math.round((count / peak) * 7)] ?? "▁")
    )
    .join("");
  return { line, max: top };
}

export function shade(fraction: number): string {
  if (fraction <= 0) {
    return SHADES[0];
  }
  return SHADES[Math.max(1, Math.round(fraction * 4))] ?? "█";
}

export function truncate(text: string, width: number): string {
  if (width <= 0) {
    return "";
  }
  const single = text.replace(/\s+/g, " ");
  return single.length > width ? `${single.slice(0, width - 1)}…` : single;
}

export function pad(text: string, width: number): string {
  const cut = truncate(text, width);
  return cut + " ".repeat(Math.max(0, width - cut.length));
}

export function padStart(text: string, width: number): string {
  const cut = truncate(text, width);
  return " ".repeat(Math.max(0, width - cut.length)) + cut;
}

/** Word-wraps one line to `width`, keeping its leading indentation. */
export function wrapLine(line: string, width: number): string[] {
  if (width <= 4 || line.length <= width) {
    return [line];
  }
  const rawIndent = line.match(/^\s*/)?.[0] ?? "";
  // A deep indent on a narrow pane would never fit; drop it.
  const indent = rawIndent.length > width / 2 ? "" : rawIndent;
  const words = line.trimStart().split(" ");
  const lines: string[] = [];
  let current = indent;
  for (const word of words) {
    const candidate = current.trim()
      ? `${current} ${word}`
      : `${current}${word}`;
    if (candidate.length > width && current.trim()) {
      lines.push(current);
      current = `${indent}${word}`;
    } else {
      current = candidate;
    }
    while (current.length > width) {
      lines.push(current.slice(0, width));
      current = `${indent}${current.slice(width)}`;
    }
  }
  if (current.trim()) {
    lines.push(current);
  }
  return lines;
}

export interface ScatterPoint {
  readonly x: number;
  readonly y: number;
  /** Index into the caller's series (colour + legend). */
  readonly series: number;
}

/**
 * Plots points on a character grid. Returns one series index (or -1 for
 * empty) per cell, rows top to bottom. Later points win collisions.
 */
export function scatterGrid(
  points: readonly ScatterPoint[],
  width: number,
  height: number,
  xRange: readonly [number, number],
  yRange: readonly [number, number]
): number[][] {
  const grid = Array.from({ length: height }, () =>
    new Array<number>(width).fill(-1)
  );
  const xSpan = xRange[1] - xRange[0] || 1;
  const ySpan = yRange[1] - yRange[0] || 1;
  for (const point of points) {
    const col = Math.round(((point.x - xRange[0]) / xSpan) * (width - 1));
    const row = Math.round(((yRange[1] - point.y) / ySpan) * (height - 1));
    const target = grid[Math.max(0, Math.min(height - 1, row))];
    if (target) {
      target[Math.max(0, Math.min(width - 1, col))] = point.series;
    }
  }
  return grid;
}
