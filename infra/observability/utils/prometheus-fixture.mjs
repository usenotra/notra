import { readFileSync } from "node:fs";
import { createServer } from "node:http";

import {
  fixtureCounts,
  windowFixtureDimensions,
  windowFixtures,
} from "../constants/prometheus-fixtures.mjs";
import {
  PLATFORM_BREAKDOWNS,
  SAFE_DIMENSIONS,
} from "../vercel/constants/metrics.ts";
import { metricSamples } from "../vercel/utils/metrics.ts";

const bodies = new Map();
for (const [job, count] of Object.entries(fixtureCounts)) {
  const samples = [];
  if (job === "vercel") {
    samples.push(
      "notra_vercel_snapshot_fresh 1",
      "notra_vercel_catalog_success 1",
      "notra_vercel_catalog_metrics 107",
      "notra_vercel_supported_metrics 107",
      "notra_vercel_query_success 1"
    );
    for (const [id, aggregation, breakdown, value, unit] of windowFixtures) {
      const metric = { id, unit };
      const dimensions = [
        ...SAFE_DIMENSIONS,
        ...(PLATFORM_BREAKDOWNS.find(
          (group) => group.id === id && group.name === breakdown
        )?.dimensions ?? []),
      ];
      samples.push(
        ...metricSamples(
          { dimensions, breakdown },
          { selections: [{ alias: "value", metric, aggregation }] },
          [
            {
              dimensions: windowFixtureDimensions,
              values: { value },
            },
          ]
        )
      );
      if (
        !samples.includes(`notra_vercel_metric_query_success{metric="${id}"} 1`)
      ) {
        samples.push(`notra_vercel_metric_query_success{metric="${id}"} 1`);
      }
    }
  } else if (job === "http-probes") {
    samples.push(
      "probe_success 1",
      "probe_duration_seconds 0.12",
      `probe_ssl_earliest_cert_expiry ${Math.floor(Date.now() / 1000) + 90 * 86400}`
    );
  }
  while (samples.length < count) {
    let labels = `id="fixture_${samples.length}"`;
    if (job === "vercel") {
      labels +=
        ',metric="fixture.metric",aggregation="count",unit="count",breakdown="project",project_id="fixture_project",environment="validation"';
    } else if (job === "application-metrics") {
      labels +=
        ',service_name="fixture-app",deployment_environment_name="validation",otel_scope_name="fixture",otel_scope_version="1.0.0"';
    }
    samples.push(`notra_fixture_${job.replaceAll("-", "_")}{${labels}} 1`);
  }
  bodies.set(job, `${samples.join("\n")}\n`);
}
createServer((request, response) => {
  const job = request.url.slice(1);
  let body = bodies.get(job);
  const mode = JSON.parse(readFileSync("/fixtures/state.json", "utf8")).mode;
  if (job === "http-probes" && mode !== "valid") {
    if (mode === "sample") {
      body = `${Array.from(
        { length: 501 },
        (_, index) => `notra_fixture_over{id="${index}"} 1`
      ).join("\n")}\n`;
    } else if (mode === "body") {
      body = `#${"x".repeat(1024 * 1024)}\nprobe_success 1\n`;
    } else {
      let labels = `fixture="${"x".repeat(2049)}"`;
      if (mode === "labels") {
        labels = Array.from(
          { length: 129 },
          (_, index) => `label_${index}="fixture"`
        ).join(",");
      } else if (mode === "name") {
        labels = `${"x".repeat(257)}="fixture"`;
      }
      body = `probe_success{${labels}} 1\n`;
    }
  }
  response.writeHead(body ? 200 : 404, {
    "Content-Type": "text/plain; version=0.0.4",
  });
  response.end(body ?? "Unknown fixture job");
}).listen(9091, "0.0.0.0");
