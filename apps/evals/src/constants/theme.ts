export const theme = {
  bg: "#0d0f12",
  panel: "#13161b",
  panelAlt: "#181c22",
  border: "#262b33",
  borderFocus: "#5b8cff",
  text: "#e6e8eb",
  muted: "#8a919c",
  faint: "#555c66",
  accent: "#5b8cff",
  good: "#3fca8a",
  warn: "#e8b44a",
  bad: "#f2645a",
  running: "#7aa2f7",
} as const;

/** Categorical series colours, one per contender (validated for dark bg). */
export const seriesColors = [
  "#5b8cff",
  "#3fca8a",
  "#e8b44a",
  "#c77dff",
  "#f2645a",
  "#38c6d9",
  "#ff8fb1",
  "#a3e635",
] as const;

export function seriesColor(index: number): string {
  return seriesColors[index % seriesColors.length] ?? theme.accent;
}

export function scoreColor(score: number): string {
  if (score >= 0.85) {
    return theme.good;
  }
  if (score >= 0.6) {
    return theme.warn;
  }
  return theme.bad;
}

export function runStatusColor(status: string): string {
  if (status === "done") {
    return theme.good;
  }
  return status === "running" ? theme.running : theme.warn;
}

/** Confusion-matrix cell colour: hits green, misses red, empty faint. */
export function matrixCellColor(count: number, isDiagonal: boolean): string {
  if (count === 0) {
    return theme.faint;
  }
  return isDiagonal ? theme.good : theme.bad;
}
