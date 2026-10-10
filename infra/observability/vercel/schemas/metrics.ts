import { SYSTEM_EVENT_PATTERN } from "../constants/metrics.ts";
import type { CatalogPage, MetricSummary } from "../types/metrics.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

/** Validate provider JSON once, then expose only the fields used by monitoring. */
export function catalogPage(value: unknown): CatalogPage {
  if (!isRecord(value) || !Array.isArray(value.metrics)) {
    throw new Error("invalid_catalog");
  }
  const metrics = value.metrics.map((metric: unknown) => {
    if (
      !isRecord(metric) ||
      typeof metric.id !== "string" ||
      typeof metric.unit !== "string" ||
      !isStringArray(metric.aggregations) ||
      metric.aggregations.length === 0 ||
      !isStringArray(metric.dimensions) ||
      !isRecord(metric.derivedFrom) ||
      typeof metric.derivedFrom.event !== "string" ||
      !SYSTEM_EVENT_PATTERN.test(metric.derivedFrom.event)
    ) {
      throw new Error("invalid_catalog");
    }
    return {
      id: metric.id,
      unit: metric.unit,
      aggregations: metric.aggregations,
      dimensions: metric.dimensions,
      derivedFrom: { event: metric.derivedFrom.event },
    };
  });
  if (value.pagination === undefined) {
    return { metrics };
  }
  if (
    !isRecord(value.pagination) ||
    typeof value.pagination.hasMore !== "boolean" ||
    (value.pagination.nextCursor != null &&
      typeof value.pagination.nextCursor !== "string")
  ) {
    throw new Error("invalid_catalog");
  }
  return {
    metrics,
    pagination: {
      hasMore: value.pagination.hasMore,
      nextCursor:
        typeof value.pagination.nextCursor === "string"
          ? value.pagination.nextCursor
          : undefined,
    },
  };
}

export function metricSummary(value: unknown): MetricSummary[] {
  if (!isRecord(value) || !Array.isArray(value.summary)) {
    throw new Error("invalid_response");
  }
  return value.summary.map((row: unknown) => {
    if (
      !isRecord(row) ||
      !isRecord(row.values) ||
      (row.dimensions != null && !isRecord(row.dimensions))
    ) {
      throw new Error("invalid_response");
    }
    return {
      values: row.values,
      dimensions: isRecord(row.dimensions) ? row.dimensions : {},
    };
  });
}
