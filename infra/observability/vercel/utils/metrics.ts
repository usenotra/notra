import {
  INGESTION_LAG_SECONDS,
  MAX_QUERY_OUTPUTS,
  PLATFORM_BREAKDOWNS,
  SAFE_DIMENSIONS,
  SERIES_LIMIT,
  WINDOW_SECONDS,
} from "../constants/metrics.ts";
import type {
  CatalogMetric,
  MetricGroup,
  MetricQuery,
  MetricQueryBody,
  MetricSelection,
  MetricSummary,
} from "../types/metrics.ts";

export function metricSelections(metric: CatalogMetric): string[] {
  let preferred = "avg";
  if (
    ["count", "bytes", "currency", "usd", "gigabyte_hour"].includes(
      metric.unit
    ) ||
    (metric.id.startsWith("vercel.ai_gateway.") &&
      metric.id.endsWith("_duration_seconds"))
  ) {
    preferred = "sum";
  }
  if (metric.id.endsWith(".count")) {
    preferred = "count";
  }
  const base = [preferred, "avg", ...metric.aggregations].find((aggregation) =>
    metric.aggregations.includes(aggregation)
  );
  return [
    ...new Set([
      base,
      ...["p95", "p99"].filter(
        (aggregation) =>
          ["milliseconds", "megabytes", "ratio", "percent"].includes(
            metric.unit
          ) && metric.aggregations.includes(aggregation)
      ),
    ]),
  ].filter((aggregation): aggregation is string => aggregation !== undefined);
}

export function platformBreakdowns(catalog: CatalogMetric[]): MetricGroup[] {
  const groups: MetricGroup[] = [];
  for (const {
    id,
    name: breakdown,
    dimensions: extra,
  } of PLATFORM_BREAKDOWNS) {
    const metric = catalog.find((item) => item.id === id);
    if (!metric || !extra.every((field) => metric.dimensions.includes(field))) {
      continue;
    }
    groups.push({
      key: `${id}:${breakdown}`,
      breakdown,
      dimensions: [
        ...SAFE_DIMENSIONS.filter((name) => metric.dimensions.includes(name)),
        ...extra,
      ],
      metrics: [metric],
    });
  }
  return groups;
}

export function metricGroups(catalog: CatalogMetric[]): MetricGroup[] {
  const groups = new Map<string, MetricGroup>();
  for (const metric of catalog) {
    // Only bounded platform metric IDs, never arbitrary custom metric names.
    if (!/^vercel(?:\.[a-z0-9_]+){2,4}$/.test(metric.id)) {
      continue;
    }
    const dimensions = SAFE_DIMENSIONS.filter((name) =>
      metric.dimensions.includes(name)
    );
    const key = `${metric.derivedFrom.event}:${dimensions.join(",")}`;
    const group = groups.get(key) ?? { key, dimensions, metrics: [] };
    group.metrics.push(metric);
    groups.set(key, group);
  }
  return [...groups.values()].flatMap((group) => {
    const parts: MetricGroup[] = [];
    let metrics: CatalogMetric[] = [];
    let outputs = 0;
    for (const metric of group.metrics) {
      const size = metricSelections(metric).length;
      if (outputs + size > MAX_QUERY_OUTPUTS) {
        parts.push({ ...group, metrics });
        metrics = [];
        outputs = 0;
      }
      metrics.push(metric);
      outputs += size;
    }
    if (metrics.length) {
      parts.push({ ...group, metrics });
    }
    return parts.map((part, index) => ({
      ...part,
      key: parts.length > 1 ? `${part.key}:part${index + 1}` : part.key,
    }));
  });
}

export function metricQuery(
  group: MetricGroup,
  teamId: string,
  now = Date.now()
): MetricQuery {
  const end =
    Math.floor((now / 1000 - INGESTION_LAG_SECONDS) / WINDOW_SECONDS) *
    WINDOW_SECONDS;
  const metrics: MetricQueryBody["metrics"] = {};
  const selections: MetricSelection[] = [];
  for (const metric of group.metrics) {
    for (const aggregation of metricSelections(metric)) {
      const alias = `m${selections.length}`;
      metrics[alias] = { metric: metric.id, aggregation };
      selections.push({ alias, metric, aggregation });
    }
  }
  const first = selections[0];
  if (!first || selections.length > MAX_QUERY_OUTPUTS) {
    throw new Error("invalid_query");
  }
  return {
    end,
    selections,
    body: {
      scope: { ownerId: teamId },
      timeRange: {
        start: new Date((end - WINDOW_SECONDS) * 1000).toISOString(),
        end: new Date(end * 1000).toISOString(),
      },
      bucketSeconds: WINDOW_SECONDS,
      ...(group.dimensions.length ? { groupBy: group.dimensions } : {}),
      metrics,
      outputs: selections.map(({ alias }) => alias),
      ...(group.dimensions.length
        ? {
            seriesSelection: {
              limit: SERIES_LIMIT,
              mode: "exact",
              rankBy: [{ metric: first.alias, direction: "desc" }],
            },
          }
        : {}),
    },
  };
}

export function promLabels(labels: Record<string, string | number>): string {
  return `{${Object.entries(labels)
    .map(
      ([key, value]) =>
        `${key}="${String(value).replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll('"', '\\"')}"`
    )
    .join(",")}}`;
}

export function metricSamples(
  group: MetricGroup,
  query: MetricQuery,
  summary: MetricSummary[]
): string[] {
  // A top-N response is not complete team coverage. Reject rather than silently truncate.
  if (summary.length >= SERIES_LIMIT) {
    throw new Error("series_limit");
  }
  const samples = [];
  for (const { alias, metric, aggregation } of query.selections) {
    const seen = new Set();
    for (const row of summary) {
      const value = row.values[alias];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        continue;
      }
      const labels: Record<string, string | number> = {
        metric: metric.id,
        aggregation,
        unit: metric.unit,
        breakdown: group.breakdown ?? "project",
      };
      for (const dimension of group.dimensions) {
        const label = row.dimensions[dimension];
        if (
          label != null &&
          !(typeof label === "number" && Number.isSafeInteger(label)) &&
          (typeof label !== "string" || !/^[a-zA-Z0-9_.:-]{0,160}$/.test(label))
        ) {
          throw new Error("invalid_dimension");
        }
        const name = dimension.replace(
          /[A-Z]/g,
          (letter) => `_${letter.toLowerCase()}`
        );
        labels[name] =
          typeof label === "string" || typeof label === "number"
            ? label
            : "unattributed";
      }
      const key = promLabels(labels);
      if (seen.has(key)) {
        throw new Error("duplicate_series");
      }
      seen.add(key);
      samples.push(`notra_vercel_metric_window${key} ${value}`);
    }
  }
  return samples;
}
