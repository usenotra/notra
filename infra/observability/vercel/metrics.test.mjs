import assert from "node:assert/strict";
import { test } from "node:test";

import { vercelApi } from "./utils/api.ts";
import { metricGroups, metricQuery, metricSamples } from "./utils/metrics.ts";
import { pollMetrics } from "./utils/poll.ts";

const count = {
  id: "vercel.request.count",
  unit: "count",
  aggregations: ["count"],
  dimensions: ["projectId", "environment", "clientIp", "requestPath"],
  derivedFrom: { event: "vercel.request" },
};
const duration = {
  ...count,
  id: "vercel.function_invocation.function_duration_ms",
  unit: "milliseconds",
  aggregations: ["avg", "p95", "p99"],
  derivedFrom: { event: "vercel.function_invocation" },
};

test("catalog queries use source events, bounded outputs and delayed native five-minute windows", () => {
  const groups = metricGroups([
    count,
    duration,
    {
      ...count,
      id: "vercel.drive.read_bytes",
      derivedFrom: { event: "vercel.drive_read" },
    },
  ]);
  assert.equal(groups.length, 3);
  const query = metricQuery(
    groups[1],
    "team_test",
    Date.parse("2026-10-10T12:19:00Z")
  );
  assert.deepEqual(query.body.timeRange, {
    start: "2026-10-10T12:00:00.000Z",
    end: "2026-10-10T12:05:00.000Z",
  });
  assert.deepEqual(query.body.groupBy, ["projectId", "environment"]);
  assert.deepEqual(
    query.selections.map(({ aggregation }) => aggregation),
    ["avg", "p95", "p99"]
  );
  const catalog = Array.from({ length: 11 }, (_, index) => ({
    ...duration,
    id: `vercel.function_invocation.duration_${index}`,
  }));
  const split = metricGroups(catalog);
  assert.deepEqual(
    split.flatMap(({ metrics }) => metrics),
    catalog
  );
  assert.ok(
    split.every(
      (group) => metricQuery(group, "team_test").body.outputs.length <= 30
    )
  );
});

test("window gauges distinguish null from zero and reject duplicate or unbounded series without private labels", () => {
  const group = metricGroups([count])[0];
  const query = metricQuery(group, "team_test");
  const row = {
    dimensions: {
      projectId: "prj_test",
      environment: "production",
      clientIp: "SECRET",
      requestPath: "/private",
    },
    values: { m0: 0 },
  };
  const lines = metricSamples(group, query, [row]).join("\n");
  assert.match(lines, /notra_vercel_metric_window.* 0$/);
  assert.doesNotMatch(lines, /SECRET|private|clientIp|requestPath/);
  assert.deepEqual(
    metricSamples(group, query, [{ ...row, values: { m0: null } }]),
    []
  );
  assert.throws(
    () => metricSamples(group, query, [row, row]),
    /duplicate_series/
  );
  assert.throws(
    () =>
      metricSamples(
        group,
        query,
        Array.from({ length: 500 }, () => row)
      ),
    /series_limit/
  );
});

test("empty successful queries and failed groups have distinct status without measurement samples", async () => {
  const result = await pollMetrics(async (_path, body) => {
    if (!body) {
      return { metrics: [count, duration] };
    }
    if (body.metrics.m0.metric === duration.id) {
      throw new Error("http_403");
    }
    return { summary: [] };
  }, "team_test");
  assert.match(
    result.text,
    /notra_vercel_query_success\{group="vercel.request:projectId,environment"\} 1/
  );
  assert.match(result.text, /notra_vercel_query_has_data.* 0/);
  assert.match(
    result.text,
    /notra_vercel_query_success\{group="vercel.function_invocation:projectId,environment"\} 0/
  );
  assert.doesNotMatch(result.text, /notra_vercel_metric_window\{/);
});

test("monitoring credentials cannot follow redirects or call another API; failures suppress provider bodies", async () => {
  const api = vercelApi("team_test", "fixture-token", async (url, init) => {
    assert.equal(url.origin, "https://api.vercel.com");
    assert.equal(init.redirect, "error");
    return new Response("sensitive", { status: 403 });
  });
  await assert.rejects(api("/v9/projects"), /Unsupported/);
  await assert.rejects(api("/metrics/v1"), /^Error: http_403$/);
});
