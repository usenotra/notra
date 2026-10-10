import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import {
  compareVectors,
  interpolateQuery,
  loopbackOrigin,
  pushPayload,
} from "./check-queries.mjs";
import { costCapacityStreams } from "./utils/cost-capacity.mjs";
import { runDocker } from "./utils/docker.mjs";

export async function checkLokiResources(spawn = spawnSync, fetchImpl = fetch) {
  const name = `notra-loki-resources-${randomUUID()}`;
  const volume = `${name}-volume`;
  const containers = [`${name}-first`, `${name}-replay`];
  // Reserve cleanup inside the ten-minute gate, including image build and startup.
  const deadline = Date.now() + 540_000;
  const docker = (args, timeout = 10_000) =>
    runDocker(
      args,
      Math.min(timeout, Math.max(1, deadline - Date.now())),
      spawn
    );
  let origin;
  const request = async (path, options = {}) => {
    assert.ok(Date.now() < deadline, "Loki resource deadline exceeded");
    const url = new URL(path, origin);
    assert.equal(url.origin, origin);
    return fetchImpl(url, {
      ...options,
      redirect: "error",
      signal: AbortSignal.timeout(Math.min(20_000, deadline - Date.now())),
    });
  };
  const metric = (text, key) =>
    text
      .split("\n")
      .filter(
        (line) => line.startsWith(`${key} `) || line.startsWith(`${key}{`)
      )
      .reduce((sum, line) => sum + Number(line.trim().split(/\s+/).at(-1)), 0);
  const budget = (container) => {
    const evidence = docker([
      "exec",
      container,
      "sh",
      "-c",
      "cat /sys/fs/cgroup/memory.peak /sys/fs/cgroup/memory.events",
    ]);
    console.log(`${container} cgroup:\n${evidence}`);
    assert.ok(
      Number(evidence.split("\n")[0]) < 768 * 1024 * 1024,
      "Loki peak exceeds 768 MiB"
    );
    assert.match(evidence, /\noom 0\n/);
    assert.match(evidence, /\noom_kill 0\n/);
  };
  const start = async (container) => {
    docker([
      "run",
      "--detach",
      "--name",
      container,
      "--memory=1g",
      "--memory-swap=1g",
      "--cpus=2",
      "--cap-drop=ALL",
      "--cap-add=CHOWN",
      "--cap-add=SETUID",
      "--cap-add=SETGID",
      "--security-opt=no-new-privileges",
      "--publish",
      "127.0.0.1::3100",
      "--mount",
      `type=volume,source=${volume},target=/loki`,
      name,
    ]);
    origin = loopbackOrigin(docker(["port", container, "3100/tcp"]));
    const started = Date.now();
    let ready = false;
    while (Date.now() - started < 120_000 && Date.now() < deadline && !ready) {
      try {
        const response = await request("/ready");
        ready = response.ok;
        await response.text();
      } catch {
        /* startup retries only */
      }
      if (!ready) {
        await delay(250);
      }
    }
    assert.ok(
      ready && Date.now() - started < 120_000,
      "Loki startup exceeds 120 seconds"
    );
    assert.match(
      docker(["exec", container, "cat", "/proc/1/status"]),
      /Uid:\s+10001\s+10001\s+10001\s+10001/
    );
    console.log(`${container} ready=${Date.now() - started}ms UID=10001`);
  };
  const push = async (streams) => {
    const body = JSON.stringify(
      pushPayload(streams, BigInt(Date.now()) * 1_000_000n)
    );
    assert.ok(Buffer.byteLength(body) < 1024 * 1024);
    const response = await request("/loki/api/v1/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    assert.equal(response.status, 204, await response.text());
    await delay(Math.ceil(Buffer.byteLength(body) / 2000));
  };
  const query = async (expression, expected, grouping) => {
    const started = performance.now();
    const params = new URLSearchParams({
      query: expression,
      time: String(BigInt(Date.now()) * 1_000_000n),
    });
    const response = await request(`/loki/api/v1/query?${params}`);
    const text = await response.text();
    assert.ok(response.ok, text);
    const body = JSON.parse(text);
    assert.equal(body.status, "success");
    compareVectors(body.data.result, expected, grouping);
    const milliseconds = performance.now() - started;
    assert.ok(milliseconds < 15_000, "Loki resource query exceeds 15 seconds");
    console.log(
      `Resource query ${milliseconds.toFixed(1)}ms: ${JSON.stringify(body.data.result)}`
    );
  };
  const sentinel = (environment, ids) => [
    {
      labels: {
        service_name: "notra-recovery-fixtures",
        deployment_environment_name: environment,
      },
      entries: ids.map((costId) => ({
        ageSeconds: 1,
        line: JSON.stringify({ costId, gatewayCostUsd: 0.5 }),
      })),
    },
  ];
  const sentinelQuery = (environment) =>
    `max by (costId) (max_over_time({deployment_environment_name="${environment}"} | json costId="costId", gatewayCostUsd="gatewayCostUsd" | unwrap gatewayCostUsd | __error__="" [5m]))`;
  const sentinelVector = (ids) =>
    ids.map((costId) => ({ metric: { costId }, value: [0, 0.5] }));
  let failure;
  try {
    docker(
      ["build", "--tag", name, fileURLToPath(new URL("loki", import.meta.url))],
      300_000
    );
    docker(["volume", "create", volume]);
    await start(containers[0]);
    const configResponse = await request("/config");
    assert.ok(configResponse.ok);
    const effective = await configResponse.text();
    assert.match(effective, /query_ingesters_within: 3h0m0s/);
    assert.match(effective, /replay_memory_ceiling: 128MB/);
    assert.match(effective, /max_concurrent: 2/);
    await push(costCapacityStreams(600, false));
    const before = await (await request("/metrics")).text();
    const ids = ["sentinel:a", "sentinel:b"];
    await push(sentinel("wal-sentinel", ids));
    await query(sentinelQuery("wal-sentinel"), sentinelVector(ids), ["costId"]);
    const accepted = await (await request("/metrics")).text();
    console.log(
      `Pre-recovery process memory:\n${accepted
        .split("\n")
        .filter((line) =>
          /^(process_resident_memory_bytes|go_memstats_heap_(alloc|inuse)_bytes) /.test(
            line
          )
        )
        .join("\n")}`
    );
    assert.equal(
      metric(accepted, "loki_ingester_chunks_flushed_total"),
      0,
      "Sentinels must remain unflushed"
    );
    assert.ok(
      metric(accepted, "loki_ingester_wal_logged_bytes_total") >
        metric(before, "loki_ingester_wal_logged_bytes_total")
    );
    assert.equal(
      docker([
        "exec",
        containers[0],
        "sh",
        "-c",
        "find /loki/chunks -type f",
      ]).trim(),
      "",
      "WAL-only proof requires no persisted chunks"
    );
    console.log(
      `WAL-only accepted sentinel: ${docker(["exec", "--user", "10001:10001", containers[0], "sh", "-c", "find /loki/wal -type f -exec wc -c {} \\;"])}`
    );
    budget(containers[0]);
    docker(["kill", "--signal=KILL", containers[0]]);
    assert.equal(
      docker([
        "inspect",
        "--format",
        "{{.State.OOMKilled}}",
        containers[0],
      ]).trim(),
      "false"
    );
    await start(containers[1]);
    const recovered = await (await request("/metrics")).text();
    console.log(
      `Post-recovery process memory:\n${recovered
        .split("\n")
        .filter((line) =>
          /^(process_resident_memory_bytes|go_memstats_heap_(alloc|inuse)_bytes) /.test(
            line
          )
        )
        .join("\n")}`
    );
    assert.equal(
      metric(recovered, "loki_ingester_wal_recovered_entries_total"),
      702,
      "Recovery must include all 700 reports and two WAL-only sentinels"
    );
    assert.ok(metric(recovered, "loki_ingester_wal_recovered_bytes_total") > 0);
    console.log(
      `Replay entries=702 bytes=${metric(recovered, "loki_ingester_wal_recovered_bytes_total")} duration=${metric(recovered, "loki_ingester_wal_replay_duration_seconds")}s`
    );
    await query(sentinelQuery("wal-sentinel"), sentinelVector(ids), ["costId"]);
    const dashboard = JSON.parse(
      readFileSync(
        new URL("grafana/dashboards/notra.json", import.meta.url),
        "utf8"
      )
    );
    const targets = [110, 111, 118, 110].map((id) =>
      interpolateQuery(
        dashboard.panels.find((panel) => panel.id === id).targets[0].expr,
        { environment: "capacity", organization: ".*" }
      )
    );
    const vectors = [
      [{ metric: {}, value: [0, 300] }],
      [{ metric: {}, value: [0, 600] }],
      ["org_capacity_a", "org_capacity_b"].map((organizationId) => ({
        metric: { organizationId },
        value: [0, 450],
      })),
      [{ metric: {}, value: [0, 300] }],
    ];
    const concurrentIds = Array.from(
      { length: 30 },
      (_, index) => `concurrent:${index}`
    );
    await Promise.all([
      ...targets.map((expression, index) =>
        query(expression, vectors[index], index === 2 ? ["organizationId"] : [])
      ),
      (async () => {
        for (let offset = 0; offset < 30; offset += 10) {
          await push(
            sentinel("concurrent", concurrentIds.slice(offset, offset + 10))
          );
          await delay(50);
        }
      })(),
    ]);
    await query(sentinelQuery("concurrent"), sentinelVector(concurrentIds), [
      "costId",
    ]);
    budget(containers[1]);
  } catch (error) {
    failure = error;
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
        failure ??= new Error(result.stderr || "Loki container cleanup failed");
      }
    }
    for (const [kind, resource] of [
      ["volume", volume],
      ["image", name],
    ]) {
      const result = spawn("docker", [kind, "rm", resource], {
        encoding: "utf8",
        timeout: 10_000,
      });
      if (
        result.status !== 0 &&
        !/No such (volume|image)/.test(result.stderr ?? "")
      ) {
        failure ??= new Error(result.stderr || "Loki resource cleanup failed");
      }
    }
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
    await checkLokiResources();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
