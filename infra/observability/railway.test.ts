import assert from "node:assert/strict";
import { test } from "node:test";

import { createRailwayContext, project } from "railway/iac";

import railway, { partial } from "../../.railway/railway.ts";

test("monitoring IaC owns only its existing resources, preserves secrets and forbids public origins", async () => {
  const definition = await railway(
    createRailwayContext({
      projectName: "notra-prod",
      environment: "production",
    }),
    project
  );
  const resources = definition.resources?.flat() ?? [];
  const services = resources.filter((resource) => resource.type === "service");
  assert.equal(partial, "observability");
  assert.deepEqual(services.map(({ name }) => name).sort(), [
    "blackbox",
    "grafana",
    "loki",
    "monitoring-tunnel",
    "otel-collector",
    "prometheus",
    "vercel-metrics",
  ]);
  assert.deepEqual(
    resources
      .filter(({ type }) => type === "volume")
      .map(({ name }) => name)
      .sort(),
    [
      "grafana-volume",
      "loki-volume",
      "otel-collector-volume",
      "prometheus-volume",
    ]
  );
  for (const service of services) {
    assert.equal(service.source, undefined);
    assert.deepEqual(service.networking, {
      customDomains: {},
      tcpProxies: {},
      serviceDomains: {},
    });
    assert.deepEqual(service.deploy?.multiRegionConfig, {
      "us-east4-eqdc4a": { numReplicas: 1 },
    });
  }
  for (const [name, secrets] of [
    ["grafana", ["GF_SECURITY_ADMIN_PASSWORD", "GF_SECURITY_SECRET_KEY"]],
    ["otel-collector", ["NOTRA_OTLP_TOKEN"]],
    ["monitoring-tunnel", ["TUNNEL_TOKEN"]],
    ["vercel-metrics", ["VERCEL_MONITORING_TOKEN"]],
  ] as const) {
    const service = services.find((item) => item.name === name);
    for (const secret of secrets) {
      assert.deepEqual(service?.variables?.[secret], { type: "preserve" });
    }
  }
  await assert.rejects(
    async () =>
      railway(
        createRailwayContext({
          projectName: "notra-prod",
          environment: "staging",
        }),
        project
      ),
    /requires notra-prod \/ production/
  );
});
