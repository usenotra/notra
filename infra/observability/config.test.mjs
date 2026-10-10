import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const dashboards = [
  "notra",
  "notra-accounting",
  "notra-surfaces",
  "notra-vercel",
].map((name) =>
  JSON.parse(
    readFileSync(
      new URL(`grafana/dashboards/${name}.json`, import.meta.url),
      "utf8"
    )
  )
);
const fixtures = ["query-fixtures", "surface-query-fixtures"].map((name) =>
  JSON.parse(
    readFileSync(new URL(`grafana/${name}.json`, import.meta.url), "utf8")
  )
);

test("public monitoring ingress validates Access identity and OTLP auth, while private Loki indexes no tenant identifiers", () => {
  const ingress = JSON.parse(
    readFileSync(new URL("tunnel/ingress.json", import.meta.url), "utf8")
  ).config.ingress;
  assert.equal(ingress[0].hostname, "grafana.usenotra.com");
  assert.equal(ingress[0].originRequest.access.required, true);
  assert.equal(ingress[0].originRequest.access.teamName, "devdungeon");
  assert.equal(ingress[0].originRequest.access.audTag.length, 1);
  assert.match(ingress[0].originRequest.access.audTag[0], /^[a-f0-9]{64}$/);
  assert.equal(ingress[1].hostname, "telemetry.usenotra.com");
  assert.equal(ingress[1].path, "^/v1/(logs|metrics)$");
  assert.equal(ingress[2].service, "http_status:404");
  const grafana = readFileSync(
    new URL("grafana/Dockerfile", import.meta.url),
    "utf8"
  );
  for (const setting of [
    "GF_AUTH_ANONYMOUS_ENABLED=false",
    "GF_AUTH_PROXY_ENABLED=true",
    "GF_AUTH_PROXY_HEADER_NAME=Cf-Access-Authenticated-User-Email",
    "GF_USERS_AUTO_ASSIGN_ORG_ROLE=Viewer",
  ]) {
    assert.ok(grafana.includes(setting));
  }
  const collector = readFileSync(
    new URL("collector/collector.yml", import.meta.url),
    "utf8"
  );
  assert.match(collector, /token: \$\{env:NOTRA_OTLP_TOKEN\}/);
  assert.match(collector, /auth:\n\s+authenticator: bearertokenauth/);
  const loki = readFileSync(new URL("loki/loki.yml", import.meta.url), "utf8");
  assert.match(loki, /ignore_defaults: true/);
  assert.equal((loki.match(/action: index_label/g) ?? []).length, 1);
  assert.match(
    loki,
    /attributes: \[service\.name, deployment\.environment\.name\]/
  );
});

test("dashboards keep pending data distinct from zero, customer filters and native-window semantics", () => {
  assert.equal(dashboards[0].refresh, "30s");
  assert.equal(dashboards[1].refresh, "");
  for (const dashboard of dashboards) {
    assert.equal(dashboard.editable, false);
    assert.equal(
      dashboard.panels.find(({ type }) => type === "row").collapsed,
      true
    );
    assert.match(
      dashboard.panels[0].options.content,
      /Missing data is not zero/
    );
    for (const panel of dashboard.panels.flatMap(
      (item) => item.panels ?? [item]
    )) {
      for (const target of panel.targets ?? []) {
        assert.ok(
          ["notra-loki", "notra-prometheus"].includes(panel.datasource.uid)
        );
        if (dashboard.uid === "notra-vercel") {
          assert.doesNotMatch(target.expr, /\b(rate|increase|sum_over_time)\(/);
          continue;
        }
        if (panel.datasource.type !== "loki") {
          continue;
        }
        assert.match(
          target.expr,
          /deployment_environment_name="\$\{environment\}"/
        );
        if (panel.type !== "logs") {
          assert.match(target.expr, /__error__=""/);
        }
        if (target.expr.includes("history_snapshot")) {
          assert.match(target.expr, /history_snapshot="20261010T113508391Z"/);
          assert.match(target.expr, /max by \((?:callId|costId)\)/);
          assert.doesNotMatch(target.expr, /or vector\(0\)/);
        }
        if (
          !target.expr.includes("notra-history-axiom") &&
          ![12, 19, 20].includes(panel.id)
        ) {
          assert.match(target.expr, /organizationId=~"\$\{organization:raw\}"/);
        }
        if (dashboard.uid === "notra-surfaces") {
          assert.match(target.expr, /userId=~"\$\{user:raw\}"/);
        }
      }
    }
  }
});

test("fixtures cover all original baseline targets and independent exact vectors without ambiguous labels", () => {
  const baselineKeys = new Set();
  for (const comparison of fixtures[0].comparisons) {
    const dashboard = dashboards.find(
      ({ uid }) => uid === comparison.dashboard
    );
    const panel = dashboard.panels
      .flatMap((item) => item.panels ?? [item])
      .find(({ id }) => id === comparison.panelId);
    const expression = panel.targets.find(
      ({ refId }) => refId === comparison.refId
    ).expr;
    assert.equal(
      expression
        .replace(/\| json \| keep [\w,]+ \|/, "| json |")
        .replace(/\| json [^|]+ \|/, "| json |"),
      comparison.baseline
    );
    baselineKeys.add(
      `${comparison.dashboard}/${comparison.panelId}/${comparison.refId}`
    );
  }
  assert.equal(baselineKeys.size, 12);
  const covered = new Set();
  for (const fixture of fixtures) {
    for (const contract of fixture.expectations) {
      const dashboard = dashboards.find(
        ({ uid }) => uid === contract.dashboard
      );
      for (const expected of contract.targets) {
        const panel = dashboard.panels
          .flatMap((item) => item.panels ?? [item])
          .find(({ id }) => id === expected.panelId);
        assert.equal(
          panel.targets.filter(({ refId }) => refId === expected.refId).length,
          1
        );
        assert.ok(expected.vector.length > 0);
        assert.equal(
          new Set(expected.vector.map(({ metric }) => JSON.stringify(metric)))
            .size,
          expected.vector.length
        );
        covered.add(
          `${contract.dashboard}/${expected.panelId}/${expected.refId}`
        );
      }
    }
  }
  assert.equal(
    covered.size,
    17,
    "Three accounting, six runtime and eight API/MCP targets"
  );
});
