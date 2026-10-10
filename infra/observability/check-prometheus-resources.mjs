import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { loopbackOrigin } from "./check-queries.mjs";
import {
  fixtureCounts,
  windowFixtureDimensions,
} from "./constants/prometheus-fixtures.mjs";
import { runDocker } from "./utils/docker.mjs";

export async function checkPrometheusResources(
  spawn = spawnSync,
  fetchImpl = fetch
) {
  const name = `notra-prometheus-resources-${randomUUID()}`;
  const containers = [`${name}-exporter`, `${name}-normal`, `${name}-reject`];
  const network = `${name}-network`;
  // Leave cleanup time inside the five-minute test budget.
  const deadline = Date.now() + 230_000;
  const source = fileURLToPath(new URL(".", import.meta.url));
  mkdirSync(resolve(source, "../../.artifacts"), { recursive: true });
  const directory = mkdtempSync(
    resolve(source, "../../.artifacts/prometheus-fixtures-")
  );
  const setMode = (mode) => {
    const temporary = resolve(directory, "state.tmp");
    writeFileSync(temporary, JSON.stringify({ mode }));
    renameSync(temporary, resolve(directory, "state.json"));
  };
  const docker = (args, timeout = 10_000) =>
    runDocker(
      args,
      Math.min(timeout, Math.max(1, deadline - Date.now())),
      spawn
    );
  let origin;
  const request = async (path) => {
    assert.ok(Date.now() < deadline, "Prometheus resource deadline exceeded");
    const url = new URL(path, origin);
    assert.equal(url.origin, origin);
    return fetchImpl(url, {
      redirect: "error",
      signal: AbortSignal.timeout(Math.min(20_000, deadline - Date.now())),
    });
  };
  const json = async (path) => {
    const response = await request(path);
    const body = await response.json();
    assert.ok(response.ok && body.status === "success", JSON.stringify(body));
    return body.data;
  };
  const query = async (expression) => {
    const started = performance.now();
    const data = await json(
      `/api/v1/query?${new URLSearchParams({ query: expression })}`
    );
    assert.equal(data.resultType, "vector");
    assert.ok(data.result.length > 0, `Empty dashboard query: ${expression}`);
    const milliseconds = performance.now() - started;
    assert.ok(milliseconds < 5000, "Normal PromQL query exceeds five seconds");
    console.log(`PromQL ${milliseconds.toFixed(1)}ms: ${expression}`);
    return data.result;
  };
  const sample = async (expression, expected) => {
    const result = await query(expression);
    assert.equal(result.length, 1);
    assert.equal(Number(result[0].value[1]), expected);
  };
  const budget = (container) => {
    const evidence = docker([
      "exec",
      container,
      "sh",
      "-c",
      "cat /sys/fs/cgroup/memory.peak /sys/fs/cgroup/memory.events",
    ]);
    console.log(`${container} cgroup (tmpfs included):\n${evidence}`);
    assert.ok(
      Number(evidence.split("\n")[0]) < 768 * 1024 * 1024,
      "Prometheus peak exceeds 768 MiB"
    );
    assert.match(evidence, /\noom 0\n/);
    assert.match(evidence, /\noom_kill 0\n/);
  };
  const flags = JSON.parse(
    readFileSync(
      new URL("prometheus/Dockerfile", import.meta.url),
      "utf8"
    ).match(/^CMD (.+)$/m)[1]
  );
  const start = async (container, tiny = false) => {
    docker([
      "run",
      "--detach",
      "--name",
      container,
      "--network",
      network,
      "--memory=1g",
      "--memory-swap=1g",
      "--cpus=2",
      "--cap-drop=ALL",
      "--cap-add=CHOWN",
      "--cap-add=SETUID",
      "--cap-add=SETGID",
      "--security-opt=no-new-privileges",
      "--publish",
      "127.0.0.1::9090",
      "--tmpfs",
      "/prometheus:rw,uid=65534,gid=65534,size=268435456",
      "--mount",
      `type=bind,source=${directory}/prometheus.yml,target=/etc/prometheus/prometheus.yml,readonly`,
      name,
      ...(tiny
        ? flags.map((flag) =>
            flag.startsWith("--query.max-samples=")
              ? "--query.max-samples=10"
              : flag
          )
        : []),
    ]);
    origin = loopbackOrigin(docker(["port", container, "9090/tcp"]));
    let ready = false;
    while (!ready && Date.now() < deadline) {
      try {
        const response = await request("/-/ready");
        ready = response.ok;
        await response.text();
      } catch {
        /* bounded startup only */
      }
      if (!ready) {
        await delay(250);
      }
    }
    assert.ok(ready);
    assert.match(
      docker(["exec", container, "cat", "/proc/1/status"]),
      /Uid:\s+65534\s+65534\s+65534\s+65534/
    );
    const actual = await json("/api/v1/status/flags");
    assert.equal(actual["query.max-concurrency"], "4");
    assert.equal(actual["query.max-samples"], tiny ? "10" : "5000000");
    console.log(
      `UID=65534 concurrency=4 maxSamples=${actual["query.max-samples"]}`
    );
  };
  const waitTargets = async (job, health, error, after = "") => {
    const end = Math.min(deadline, Date.now() + 20_000);
    while (Date.now() < end) {
      const targets = (await json("/api/v1/targets")).activeTargets;
      const selected = targets.filter(
        (target) => !job || target.labels.job === job
      );
      if (
        selected.length === (job ? 1 : Object.keys(fixtureCounts).length) &&
        selected.every(
          (target) =>
            target.health === health &&
            Date.parse(target.lastScrape) > 0 &&
            target.lastScrape !== after &&
            (!error || error.test(target.lastError))
        )
      ) {
        assert.ok(
          selected.every((target) => target.lastScrapeDuration < 2),
          "Scrape exceeds fixture timeout"
        );
        return selected;
      }
      await delay(250);
    }
    throw new Error(
      `Scrape health/error did not converge: ${job} ${health} ${error}`
    );
  };
  let failure;
  try {
    const config = readFileSync(
      new URL("prometheus/prometheus.yml", import.meta.url),
      "utf8"
    );
    const jobs = [
      ...config.matchAll(
        / {2}- job_name: ([\w-]+)\n([\s\S]*?)(?= {2}- job_name:|$)/g
      ),
    ];
    assert.equal(jobs.length, 7);
    const fixtureConfig = `global:\n  scrape_interval: 2s\n  scrape_timeout: 2s\nscrape_configs:\n${jobs
      .map(([, job, text]) => {
        const limits = [
          "sample_limit",
          "body_size_limit",
          "label_limit",
          "label_name_length_limit",
          "label_value_length_limit",
        ]
          .map((key) => {
            const value = text.match(new RegExp(`    ${key}: (\\S+)`))?.[1];
            assert.ok(value, `Missing source budget: ${job}/${key}`);
            return `    ${key}: ${value}\n`;
          })
          .join("");
        return `  - job_name: ${job}\n${limits}    metrics_path: /${job}\n    static_configs:\n      - targets: ["fixture-exporter:9091"]\n`;
      })
      .join("")}`;
    writeFileSync(resolve(directory, "prometheus.yml"), fixtureConfig);
    setMode("valid");
    docker(["build", "--tag", name, resolve(source, "prometheus")], 120_000);
    docker(["network", "create", network]);
    const nodeImage = readFileSync(
      new URL("vercel/Dockerfile", import.meta.url),
      "utf8"
    ).match(/^FROM (\S+)/)[1];
    docker([
      "run",
      "--detach",
      "--name",
      containers[0],
      "--network",
      network,
      "--network-alias",
      "fixture-exporter",
      "--read-only",
      "--user",
      "1000:1000",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--mount",
      `type=bind,source=${directory},target=/fixtures,readonly`,
      ...["utils", "constants", "vercel"].flatMap((folder) => [
        "--mount",
        `type=bind,source=${resolve(source, folder)},target=/source/${folder},readonly`,
      ]),
      nodeImage,
      "node",
      "/source/utils/prometheus-fixture.mjs",
    ]);
    await start(containers[1]);
    const healthy = await waitTargets(null, "up");
    console.log(
      `Valid scrape durations: ${JSON.stringify(healthy.map((target) => ({ job: target.labels.job, seconds: target.lastScrapeDuration })))}`
    );
    for (const [job, count] of Object.entries(fixtureCounts)) {
      await sample(
        `scrape_samples_post_metric_relabeling{job="${job}"}`,
        count
      );
      await sample(`up{job="${job}"}`, 1);
    }
    const head =
      Object.values(fixtureCounts).reduce((sum, count) => sum + count, 0) +
      7 * 5;
    await sample('count({job=~".+"})', head);
    console.log(
      `Head series exact=${head}; application=50000 Vercel=100000 simultaneous samples`
    );
    try {
      const response = await request("/metrics");
      const metrics = await response.text();
      console.log(
        `Process memory/head supplement:\n${metrics
          .split("\n")
          .filter((line) =>
            /^(process_resident_memory_bytes|go_memstats_heap_(alloc|inuse)_bytes|prometheus_tsdb_head_series) /.test(
              line
            )
          )
          .join("\n")}`
      );
    } catch {
      console.log(
        "Process memory supplement unavailable; cgroup gate remains required"
      );
    }
    const targets = [
      "notra",
      "notra-accounting",
      "notra-surfaces",
      "notra-vercel",
    ]
      .flatMap((dashboard) => {
        const definition = JSON.parse(
          readFileSync(
            new URL(`grafana/dashboards/${dashboard}.json`, import.meta.url),
            "utf8"
          )
        );
        return definition.panels
          .flatMap((panel) => panel.panels ?? [panel])
          .flatMap((panel) =>
            panel.datasource?.uid === "notra-prometheus" ? panel.targets : []
          );
      })
      .map(({ expr, legendFormat }) => ({
        expression: expr
          .replaceAll(`\${environment}`, "validation")
          .replaceAll(`\${project:regex}`, "fixture_project")
          .replaceAll(`\${metric}`, "vercel.request.count"),
        legendFormat,
      }));
    for (const { expression, legendFormat } of targets) {
      const result = await query(expression);
      for (const [, label] of (legendFormat ?? "").matchAll(/\{\{(\w+)\}\}/g)) {
        for (const series of result) {
          assert.ok(
            series.metric[label] && series.metric[label] !== "unattributed",
            `Missing dashboard legend label ${label}: ${expression}`
          );
          const expected =
            windowFixtureDimensions[
              label.replace(/_([a-z])/g, (_match, letter) =>
                letter.toUpperCase()
              )
            ];
          if (expected !== undefined) {
            assert.equal(series.metric[label], expected);
          }
        }
      }
    }
    await Promise.all(
      targets.slice(0, 4).map(({ expression }) => query(expression))
    );
    await sample(
      'notra_vercel_metric_window{metric="vercel.request.count",aggregation="count",breakdown="project"}',
      230
    );
    const [previousWindow] = await waitTargets("vercel", "up");
    await waitTargets("vercel", "up", null, previousWindow.lastScrape);
    await sample(
      'notra_vercel_metric_window{metric="vercel.request.count",aggregation="count",breakdown="project"}',
      230
    );
    for (const [mode, error] of [
      ["sample", /sample.*limit/i],
      ["body", /body.*limit/i],
      ["labels", /label.*limit/i],
      ["name", /label.*name.*(length|long|limit)/i],
      ["value", /label.*value.*(length|long|limit)/i],
    ]) {
      const [previous] = await waitTargets("http-probes", "up");
      setMode(mode);
      const [rejected] = await waitTargets(
        "http-probes",
        "down",
        error,
        previous.lastScrape
      );
      await sample('up{job="http-probes"}', 0);
      console.log(`Rejected ${mode}: ${rejected.lastError}`);
      setMode("valid");
      await waitTargets("http-probes", "up", null, rejected.lastScrape);
      await sample('up{job="http-probes"}', 1);
    }
    budget(containers[1]);
    docker(["stop", "--timeout=5", containers[1]]);
    await start(containers[2], true);
    await waitTargets(null, "up");
    const rejection = await request(
      `/api/v1/query?${new URLSearchParams({ query: "sum(notra_fixture_prometheus)" })}`
    );
    const rejected = await rejection.json();
    assert.ok(!rejection.ok && rejected.status === "error");
    assert.match(rejected.error, /too many samples|maximum.*samples/i);
    console.log(
      `Derived test maxSamples=10 rejected visibly: ${rejected.error}`
    );
    await sample('up{job="vercel"}', 1);
    budget(containers[2]);
  } catch (error) {
    failure = error;
    const exporterLogs = spawn("docker", ["logs", "--tail=20", containers[0]], {
      encoding: "utf8",
      timeout: 10_000,
    });
    console.error(exporterLogs.stdout || exporterLogs.stderr);
    try {
      const targets = await json("/api/v1/targets");
      console.error(
        JSON.stringify(
          targets.activeTargets.map((target) => ({
            job: target.labels.job,
            health: target.health,
            lastScrape: target.lastScrape,
            duration: target.lastScrapeDuration,
            error: target.lastError,
          }))
        )
      );
    } catch {
      /* diagnostics must never prevent scoped cleanup */
    }
  } finally {
    for (const container of containers) {
      const result = spawn("docker", ["rm", "--force", container], {
        encoding: "utf8",
        timeout: 10_000,
      });
      if (
        result.status !== 0 &&
        !result.stderr?.includes("No such container")
      ) {
        failure ??= new Error(result.stderr || "Prometheus cleanup failed");
      }
    }
    for (const [kind, resource] of [
      ["network", network],
      ["image", name],
    ]) {
      const result = spawn("docker", [kind, "rm", resource], {
        encoding: "utf8",
        timeout: 10_000,
      });
      if (
        result.status !== 0 &&
        !/No such (network|image)|not found/.test(result.stderr ?? "")
      ) {
        failure ??= new Error(
          result.stderr || "Prometheus resource cleanup failed"
        );
      }
    }
    rmSync(directory, { recursive: true });
  }
  if (failure) {
    throw failure;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await checkPrometheusResources();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
