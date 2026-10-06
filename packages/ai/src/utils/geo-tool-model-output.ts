export function geoToolModelOutput(output: unknown) {
  let value = output;
  if (
    typeof output === "object" &&
    output !== null &&
    !Array.isArray(output) &&
    "chart" in output
  ) {
    const metrics: Record<string, unknown> = { ...output };
    Reflect.deleteProperty(metrics, "chart");
    if (Array.isArray(metrics.points) && metrics.points.length > 0) {
      const first = metrics.points[0];
      if (
        typeof first === "object" &&
        first !== null &&
        !Array.isArray(first)
      ) {
        const columns = Object.keys(first);
        if (
          columns.length > 0 &&
          metrics.points.every(
            (point) =>
              typeof point === "object" &&
              point !== null &&
              !Array.isArray(point) &&
              Object.keys(point).length === columns.length &&
              columns.every(
                (column) =>
                  Object.hasOwn(point, column) && point[column] !== undefined
              )
          )
        ) {
          metrics.points = {
            columns,
            rows: metrics.points.map((point) =>
              columns.map((column) => point[column])
            ),
          };
        }
      }
    }
    value = metrics;
  }
  return { type: "text" as const, value: JSON.stringify(value) ?? "null" };
}
