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
          assert.match(target.expr, /max by \((?:callId|costId)(?:,\w+)*\)/);
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
  const overview = dashboards[0];
  for (const id of [107, 108, 104, 110, 111, 118, 7]) {
    assert.ok(overview.panels.some((panel) => panel.id === id));
  }
  const infrastructure = overview.panels.find((panel) => panel.id === 201);
  assert.equal(infrastructure.collapsed, true);
  assert.ok(infrastructure.panels.some((panel) => panel.id === 2));
  assert.ok(
    infrastructure.gridPos.y >
      overview.panels.find((panel) => panel.id === 7).gridPos.y
  );
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
    21,
    "Four GEO, three accounting, six runtime and eight API/MCP targets"
  );
});

test("grouped instant gauges retain every customer/outcome series, names and customer links", () => {
  for (const dashboard of dashboards.slice(0, 3)) {
    const gauges = dashboard.panels
      .flatMap((panel) => panel.panels ?? [panel])
      .filter(({ type }) => type === "bargauge");
    assert.equal(gauges.length, dashboard.uid === "notra-overview" ? 4 : 2);
    for (const panel of gauges) {
      let label = "organizationId";
      if (panel.id === 115) {
        label = "outcome";
      } else if (dashboard.uid === "notra-surfaces" && panel.id === 9) {
        label = "userId";
      }
      // Loki converts instant vectors to a long table; restore labels before reduction.
      assert.deepEqual(panel.transformations, [
        { id: "prepareTimeSeries", options: { format: "multi" } },
      ]);
      assert.equal(
        panel.fieldConfig.defaults.displayName,
        `\${__field.labels.${label}}`
      );
      assert.equal(panel.fieldConfig.defaults.min, 0);
      assert.deepEqual(panel.options.reduceOptions, {
        calcs: ["lastNotNull"],
        values: false,
      });
      for (const target of panel.targets) {
        // Pinned Grafana's Loki migration maps the legacy flag to native instant mode.
        assert.equal(
          target.queryType ?? (target.instant === true ? "instant" : "range"),
          "instant"
        );
        assert.notEqual(target.range, true);
        assert.match(target.expr, /\[\$__range\]/);
        assert.equal(target.legendFormat, `{{${label}}}`);
      }
      if (dashboard.uid === "notra-overview" && label === "organizationId") {
        assert.equal(
          panel.fieldConfig.defaults.links[0].url,
          `/d/notra-overview?\${__url_time_range}&var-environment=\${environment}&var-organization=\${__field.labels.organizationId}`
        );
      }
    }
  }
});

test("spend headers have readable height and product panels meet collapsed rows without gaps or overlaps", () => {
  for (const dashboard of dashboards.slice(0, 2)) {
    assert.equal(dashboard.panels[0].gridPos.h, 4);
    const positions = dashboard.panels.map(({ gridPos }) => gridPos);
    for (const [index, a] of positions.entries()) {
      for (const b of positions.slice(index + 1)) {
        assert.ok(
          a.x + a.w <= b.x ||
            b.x + b.w <= a.x ||
            a.y + a.h <= b.y ||
            b.y + b.h <= a.y
        );
      }
    }
    const occupied = new Set(
      positions.flatMap(({ y, h }) =>
        Array.from({ length: h }, (_, offset) => y + offset)
      )
    );
    assert.equal(
      occupied.size,
      Math.max(...positions.map(({ y, h }) => y + h))
    );
    for (const row of dashboard.panels.filter(({ type }) => type === "row")) {
      assert.equal(row.collapsed, true);
      assert.equal(row.gridPos.h, 1);
      assert.ok(row.panels.every(({ gridPos }) => gridPos.y > row.gridPos.y));
    }
  }
});

test("finite cost series limit and snapshot/navigation links retain scope without changing live defaults", () => {
  const loki = readFileSync(new URL("loki/loki.yml", import.meta.url), "utf8");
  assert.match(loki, /max_query_series: 65536\n/);
  assert.match(loki, /retention_period: 336h\n/);
  assert.match(loki, /replay_memory_ceiling: 128MB\n/);
  assert.match(loki, /concurrent_flushes: 4\n/);
  assert.match(loki, /retention_delete_worker_count: 10\n/);
  assert.match(loki, /max_concurrent: 2\n/);
  assert.match(loki, /max_query_parallelism: 2\n/);
  assert.match(loki, /tsdb_max_query_parallelism: 2\n/);
  assert.equal((loki.match(/max_size_mb: 16\n/g) ?? []).length, 5);
  assert.doesNotMatch(
    loki,
    /query_ingesters_within|cache_instant_metric_results|cache_results:/
  );
  const prometheus = readFileSync(
    new URL("prometheus/prometheus.yml", import.meta.url),
    "utf8"
  );
  const budgets = new Map([
    ["prometheus", [10000, "8MB"]],
    ["loki", [10000, "8MB"]],
    ["collector", [2000, "2MB"]],
    ["blackbox", [2000, "2MB"]],
    ["application-metrics", [50000, "16MB"]],
    ["vercel", [100000, "32MB"]],
    ["http-probes", [500, "1MB"]],
  ]);
  const jobs = [
    ...prometheus.matchAll(
      / {2}- job_name: ([\w-]+)\n([\s\S]*?)(?= {2}- job_name:|$)/g
    ),
  ];
  assert.equal(jobs.length, budgets.size);
  for (const [, job, config] of jobs) {
    const [samples, body] = budgets.get(job);
    assert.match(config, new RegExp(`sample_limit: ${samples}\\n`));
    assert.match(config, new RegExp(`body_size_limit: ${body}\\n`));
    assert.match(config, /label_limit: 128\n/);
    assert.match(config, /label_name_length_limit: 256\n/);
    assert.match(config, /label_value_length_limit: 2048\n/);
  }
  const command = readFileSync(
    new URL("prometheus/Dockerfile", import.meta.url),
    "utf8"
  );
  assert.match(command, /--query.max-concurrency=4/);
  assert.match(command, /--query.max-samples=5000000/);
  for (const dashboard of dashboards.slice(0, 2)) {
    const content = dashboard.panels[0].options.content;
    assert.match(content, /selected-range intersection/);
    assert.match(
      content,
      /from=2026-10-03T11:35:08\.391Z&to=2026-10-10T11:35:08\.391Z/
    );
    assert.match(
      content,
      /var-environment=\$\{environment\}&var-organization=\$\{organization:percentencode\}/
    );
  }
  assert.match(
    dashboards[1].panels[0].options.content,
    /notra-overview\?\$\{__url_time_range\}&var-environment=/
  );
});
