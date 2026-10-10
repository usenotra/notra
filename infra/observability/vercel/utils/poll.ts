import { metricSummary } from "../schemas/metrics.ts";
import type { QueryResult, VercelApi } from "../types/metrics.ts";
import { metricCatalog } from "./api.ts";
import {
  metricGroups,
  metricQuery,
  metricSamples,
  platformBreakdowns,
  promLabels,
} from "./metrics.ts";

export async function pollMetrics(
  api: VercelApi,
  teamId: string,
  now = Date.now()
) {
  const catalog = await metricCatalog(api);
  const groups = metricGroups(catalog);
  const lines = [
    `notra_vercel_catalog_metrics ${catalog.length}`,
    `notra_vercel_supported_metrics ${groups.reduce((total, group) => total + group.metrics.length, 0)}`,
  ];
  const pending = [...groups, ...platformBreakdowns(catalog)];
  const results: QueryResult[] = [];
  // Two workers, bounded requests, no overlapping polls or unbounded retries.
  await Promise.all(
    [0, 1].map(async () => {
      for (let group = pending.shift(); group; group = pending.shift()) {
        const labels = promLabels({ group: group.key });
        let result: QueryResult;
        try {
          const query = metricQuery(group, teamId, now);
          const summary = metricSummary(await api("/metrics/v1", query.body));
          const samples = metricSamples(group, query, summary);
          lines.push(
            ...samples,
            `notra_vercel_query_has_data${labels} ${Number(samples.length > 0)}`,
            `notra_vercel_window_end_seconds${labels} ${query.end}`
          );
          result = {
            group: group.key,
            ok: true,
            rows: summary.length,
          };
        } catch (error) {
          const reason =
            error instanceof Error &&
            /^(http_\d{3}|invalid_query|invalid_response|invalid_dimension|series_limit|duplicate_series)$/.test(
              error.message
            )
              ? error.message
              : "request_failed";
          result = { group: group.key, ok: false, reason };
        }
        lines.push(`notra_vercel_query_success${labels} ${Number(result.ok)}`);
        if (!group.breakdown) {
          for (const metric of group.metrics) {
            lines.push(
              `notra_vercel_metric_query_success${promLabels({ metric: metric.id })} ${Number(result.ok)}`
            );
          }
        }
        results.push(result);
      }
    })
  );
  return {
    text: `${lines.join("\n")}\n`,
    results,
    catalogCount: catalog.length,
  };
}
