/** A full-width zero axis also works when a series has no line segment to draw. */
export function buildZeroBaselineAxisLine(
  data: readonly Record<string, unknown>[],
  seriesKeys: readonly string[],
  color: string
) {
  return {
    show:
      seriesKeys.length > 0 &&
      data.every((row) => seriesKeys.every((key) => row[key] === 0)),
    onZero: true,
    lineStyle: { color, width: 1.5 },
  };
}
