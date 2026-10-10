import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { costCapacityStreams } from "./utils/cost-capacity.mjs";
import { runDocker } from "./utils/docker.mjs";
import { upstreamImage } from "./validate-config.mjs";

export function interpolateQuery(query, selection, range = "5m") {
  assert.match(range, /^\d+[smhd]$/);
  const values = {
    [`\${environment}`]: JSON.stringify(selection.environment).slice(1, -1),
    [`\${organization:raw}`]: selection.organization,
    [`\${user:raw}`]: selection.user ?? ".*",
    $__range: range,
    $__auto: range,
  };
  const result = query.replace(
    /\$\{environment\}|\$\{organization:raw\}|\$\{user:raw\}|\$__range|\$__auto/g,
    (variable) => values[variable]
  );
  assert.doesNotMatch(result, /\$\{|\$__/, "Unresolved dashboard variable");
  return result;
}

export function pushPayload(streams, evaluationTime) {
  assert.equal(typeof evaluationTime, "bigint");
  return {
    streams: streams.map(({ labels, entries }) => ({
      stream: labels,
      values: entries
        .map(({ ageSeconds, line }) => {
          assert.ok(Number.isSafeInteger(ageSeconds) && ageSeconds >= 0);
          assert.equal(typeof line, "string");
          const timestamp =
            evaluationTime - BigInt(ageSeconds) * 1_000_000_000n;
          assert.ok(timestamp > 0n);
          return [String(timestamp), line];
        })
        .sort(([a], [b]) => {
          if (a === b) {
            return 0;
          }
          return BigInt(a) < BigInt(b) ? -1 : 1;
        }),
    })),
  };
}

export function compareVectors(actual, expected, grouping) {
  function sorted(vector) {
    assert.ok(Array.isArray(vector), "Expected a Loki instant vector");
    const rows = vector
      .map(({ metric, value }) => {
        assert.ok(
          metric && typeof metric === "object" && !Array.isArray(metric)
        );
        const labels = Object.keys(metric)
          .sort()
          .map((key) => {
            assert.ok(
              key !== "__error__" && grouping.includes(key),
              `Unexpected result label: ${key}`
            );
            assert.equal(typeof metric[key], "string");
            return [key, metric[key]];
          });
        assert.ok(Array.isArray(value) && value.length === 2);
        assert.ok(
          typeof value[1] === "number" ||
            (typeof value[1] === "string" && value[1].trim() !== ""),
          "Missing or invalid Loki sample"
        );
        const number = Number(value[1]);
        assert.ok(Number.isFinite(number), "Non-finite Loki sample");
        return { labels: JSON.stringify(labels), number };
      })
      .sort((a, b) => a.labels.localeCompare(b.labels));
    assert.equal(
      new Set(rows.map(({ labels }) => labels)).size,
      rows.length,
      "Duplicate result labels"
    );
    return rows;
  }
  const left = sorted(actual);
  const right = sorted(expected);
  assert.deepEqual(
    left.map(({ labels }) => labels),
    right.map(({ labels }) => labels)
  );
  left.forEach(({ number }, index) => {
    assert.ok(
      Math.abs(number - right[index].number) <= 1e-9,
      `Sample mismatch for ${left[index].labels}: ${number} != ${right[index].number}`
    );
  });
}

export function loopbackOrigin(portOutput) {
  const match = /^127\.0\.0\.1:([0-9]+)$/.exec(portOutput.trim());
  assert.ok(match, "Docker must publish Loki only on 127.0.0.1");
  const port = Number(match[1]);
  assert.ok(Number.isInteger(port) && port > 0 && port <= 65535);
  return `http://127.0.0.1:${port}`;
}

export async function checkQueries(
  spawn = spawnSync,
  fetchImpl = fetch,
  capacity = false
) {
  // Include image setup and reserve bounded cleanup inside the five-minute capacity budget.
  const capacityDeadline = capacity ? Date.now() + 255_000 : undefined;
  function docker(args, timeout = 10_000) {
    if (capacity) {
      const remaining = capacityDeadline - Date.now();
      assert.ok(remaining > 0, "Loki capacity deadline exceeded");
      return runDocker(args, Math.min(timeout, remaining), spawn);
    }
    return runDocker(args, timeout, spawn);
  }
  try {
    docker(["info", "--format", "{{.ServerVersion}}"]);
  } catch (cause) {
    throw new Error(
      "Docker is required for native query checks. Start a local Docker daemon, ensure `docker info` succeeds, then rerun `node infra/observability/check-queries.mjs`. Query evaluation was not skipped.",
      { cause }
    );
  }
  const fixtures = JSON.parse(
    readFileSync(
      new URL("grafana/query-fixtures.json", import.meta.url),
      "utf8"
    )
  );
  assert.equal(fixtures.version, 1);
  assert.equal(fixtures.range, "5m");
  const dashboards = ["notra", "notra-accounting", "notra-surfaces"].map(
    (name) =>
      JSON.parse(
        readFileSync(
          new URL(`grafana/dashboards/${name}.json`, import.meta.url),
          "utf8"
        )
      )
  );
  function target(dashboard, panelId, refId) {
    const panel = dashboards
      .find(({ uid }) => uid === dashboard)
      ?.panels.flatMap((candidate) => candidate.panels ?? [candidate])
      .find(({ id }) => id === panelId);
    const matches = panel?.targets.filter(
      (candidate) => candidate.refId === refId
    );
    assert.equal(
      matches?.length,
      1,
      `Missing/ambiguous target ${dashboard}/${panelId}/${refId}`
    );
    return matches[0].expr;
  }
  const image = upstreamImage(
    readFileSync(new URL("loki/Dockerfile", import.meta.url), "utf8"),
    "grafana/loki"
  );
  const name = `notra-query-fixtures-${randomUUID()}`;
  // Pull before attempting creation; all Docker calls are bounded. No .env,
  // production volumes, credentials, or service endpoints are used.
  docker(["pull", image], 120_000);
  const deadline = capacityDeadline ?? Date.now() + 120_000;
  let failure;
  try {
    if (capacity) {
      docker(
        [
          "build",
          "--tag",
          name,
          fileURLToPath(new URL("loki", import.meta.url)),
        ],
        120_000
      );
    }
    docker([
      "run",
      "--detach",
      "--rm",
      "--name",
      name,
      ...(capacity ? ["--memory=1g", "--memory-swap=1g", "--cpus=2"] : []),
      "--read-only",
      "--user",
      "10001:10001",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--publish",
      "127.0.0.1::3100",
      "--tmpfs",
      "/loki:rw,nosuid,noexec,size=268435456,uid=10001,gid=10001,mode=0700",
      "--tmpfs",
      "/tmp:rw,nosuid,noexec,size=67108864,uid=10001,gid=10001,mode=0700",
      "--mount",
      `type=bind,source=${fileURLToPath(new URL("loki/loki.yml", import.meta.url))},target=/etc/loki/notra.yml,readonly`,
      "--entrypoint",
      "/usr/bin/loki",
      capacity ? name : image,
      "-config.file=/etc/loki/notra.yml",
      "-ingester.wal-dir=/loki/wal",
    ]);
    const origin = loopbackOrigin(docker(["port", name, "3100/tcp"]));
    const request = async (path, options = {}) => {
      const remaining = deadline - Date.now();
      assert.ok(remaining > 0, "Loki query check deadline exceeded");
      const url = new URL(path, origin);
      assert.equal(url.origin, origin);
      assert.equal(url.hostname, "127.0.0.1");
      return fetchImpl(url, {
        ...options,
        redirect: "error",
        signal: AbortSignal.timeout(
          Math.min(capacity ? 20_000 : 5000, remaining)
        ),
      });
    };
    const readyDeadline = Date.now() + 60_000;
    let ready = false;
    while (Date.now() < readyDeadline) {
      try {
        const response = await request("/ready");
        ready = response.ok;
        await response.text();
        if (ready) {
          break;
        }
      } catch {
        /* readiness retries are bounded; queries never retry failures */
      }
      await delay(250);
    }
    assert.ok(ready, "Disposable Loki did not become ready within 60 seconds");
    const evaluationTime = BigInt(Date.now()) * 1_000_000n;
    const pushed = await request("/loki/api/v1/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pushPayload(fixtures.streams, evaluationTime)),
    });
    assert.equal(
      pushed.status,
      204,
      `Loki fixture push failed: ${await pushed.text()}`
    );
    const timings = [];
    const query = async (expression, selection, range = fixtures.range) => {
      const started = performance.now();
      const params = new URLSearchParams({
        query: interpolateQuery(expression, selection, range),
        time: String(evaluationTime),
      });
      const response = await request(`/loki/api/v1/query?${params}`);
      const text = await response.text();
      assert.ok(
        response.ok,
        `Loki query failed (${response.status}): ${text}\n${expression}`
      );
      const body = JSON.parse(text);
      assert.equal(body.status, "success");
      assert.equal(body.data.resultType, "vector");
      const milliseconds = performance.now() - started;
      if (selection.environment === "capacity") {
        timings.push(milliseconds);
        console.log(
          `Cost query ${selection.organization} ${milliseconds.toFixed(1)}ms: ${JSON.stringify(body.data.result)}`
        );
        assert.ok(milliseconds < 15_000, "Cost query exceeded 15 seconds");
      }
      return body.data.result;
    };
    for (const selection of fixtures.selections) {
      for (const comparison of fixtures.comparisons) {
        const current = target(
          comparison.dashboard,
          comparison.panelId,
          comparison.refId
        );
        try {
          compareVectors(
            await query(comparison.baseline, selection),
            await query(current, selection),
            comparison.grouping
          );
        } catch (cause) {
          throw new Error(
            `${comparison.dashboard}/${comparison.panelId}/${comparison.refId} ${JSON.stringify(selection)}: ${cause.message}`,
            { cause }
          );
        }
      }
    }
    const surfaceFixtures = JSON.parse(
      readFileSync(
        new URL("grafana/surface-query-fixtures.json", import.meta.url),
        "utf8"
      )
    );
    assert.equal(surfaceFixtures.version, 1);
    const surfacePush = await request("/loki/api/v1/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        pushPayload(
          [
            {
              labels: {
                service_name: "notra-surfaces-fixtures",
                deployment_environment_name: "validation",
              },
              entries: surfaceFixtures.events.map((event, index) => ({
                ageSeconds: 30 + index,
                line: JSON.stringify(event),
              })),
            },
          ],
          evaluationTime
        )
      ),
    });
    assert.equal(surfacePush.status, 204);
    for (const contract of [
      ...fixtures.expectations,
      ...surfaceFixtures.expectations,
    ]) {
      for (const expected of contract.targets) {
        const expression = target(
          contract.dashboard,
          expected.panelId,
          expected.refId
        );
        for (const selection of contract.selections) {
          try {
            compareVectors(
              await query(expression, selection),
              expected.vector,
              expected.grouping
            );
          } catch (cause) {
            throw new Error(
              `${contract.dashboard}/${expected.panelId}/${expected.refId} ${JSON.stringify(selection)}: ${cause.message}`,
              { cause }
            );
          }
        }
      }
    }
    const boundaryPush = await request("/loki/api/v1/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        pushPayload(
          [
            {
              labels: {
                service_name: "notra-history-database-boundary",
                deployment_environment_name: "boundary",
                history_snapshot: "20261010T113508391Z",
              },
              entries: [
                [86401, "outside", 8],
                [86400, "edge", 4],
                [86399, "inside", 2],
                [86398, "inside", 2],
              ].map(([ageSeconds, costId, costUsd]) => ({
                ageSeconds,
                line: JSON.stringify({
                  event: "history.geo.scan",
                  organizationId: "org_boundary",
                  costId,
                  costUsd,
                }),
              })),
            },
          ],
          evaluationTime
        )
      ),
    });
    assert.equal(boundaryPush.status, 204, await boundaryPush.text());
    // Old fixture chunks need store visibility; do not widen production ingestion queries.
    const boundaryFlush = await request("/flush", { method: "POST" });
    assert.ok(boundaryFlush.ok, await boundaryFlush.text());
    const boundaryExpression = target("notra-overview", 109, "A");
    const boundarySelection = { environment: "boundary", organization: ".*" };
    let boundaryVector = [];
    const visibilityDeadline = Date.now() + 5000;
    while (boundaryVector.length === 0 && Date.now() < visibilityDeadline) {
      boundaryVector = await query(boundaryExpression, boundarySelection);
      if (boundaryVector.length === 0) {
        await delay(250);
      }
    }
    compareVectors(
      boundaryVector,
      [{ metric: { organizationId: "org_boundary" }, value: [0, 2] }],
      ["organizationId"]
    );
    // Pinned native Loki excludes the exact left edge, as well as the older sample.
    compareVectors(
      await query(
        boundaryExpression.replace(
          "| unwrap costUsd",
          '| costId="edge" | unwrap costUsd'
        ),
        boundarySelection
      ),
      [],
      ["organizationId"]
    );
    const count = capacity ? 50_000 : 600;
    for (const stream of costCapacityStreams(count, capacity)) {
      const body = JSON.stringify(pushPayload([stream], evaluationTime));
      assert.ok(
        Buffer.byteLength(body) < 1024 * 1024,
        "Fixture batch exceeds 1 MiB"
      );
      const response = await request("/loki/api/v1/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      assert.equal(response.status, 204, await response.text());
      if (capacity) {
        await delay(Math.ceil(Buffer.byteLength(body) / 2000));
      }
    }
    // Old six-day chunks must be persisted before the store can query them.
    if (capacity) {
      const response = await request("/flush", { method: "POST" });
      assert.ok(response.ok, await response.text());
    }
    for (const [dashboard, ids] of [
      ["notra-overview", [110, 111, 118]],
      ["notra-accounting", [10, 11, 18]],
    ]) {
      for (const organization of [
        ".*",
        "org_capacity_a",
        "org_capacity_absent",
      ]) {
        for (const [index, id] of ids.entries()) {
          const grouping = index === 2 ? ["organizationId"] : [];
          const selected = organization === "org_capacity_a";
          let expected = [];
          if (organization !== "org_capacity_absent") {
            if (index === 2) {
              expected = (
                selected
                  ? ["org_capacity_a"]
                  : ["org_capacity_a", "org_capacity_b"]
              ).map((org) => ({
                metric: { organizationId: org },
                value: [0, capacity ? 37_500 : 450],
              }));
            } else {
              expected = [
                {
                  metric: {},
                  value: [
                    0,
                    (capacity ? [25_000, 50_000] : [300, 600])[index] /
                      (selected ? 2 : 1),
                  ],
                },
              ];
            }
          }
          compareVectors(
            await query(
              target(dashboard, id, "A"),
              { environment: "capacity", organization },
              capacity ? "7d" : "5m"
            ),
            expected,
            grouping
          );
        }
      }
    }
    if (capacity) {
      for (let offset = 0; offset < 65_537; offset += 1000) {
        const body = JSON.stringify(
          pushPayload(
            [
              {
                labels: {
                  service_name: "notra-rejection-fixtures",
                  deployment_environment_name: "rejection",
                },
                entries: Array.from(
                  { length: Math.min(1000, 65_537 - offset) },
                  (_, index) => ({
                    ageSeconds: 10,
                    line: JSON.stringify({
                      costId: `rejection:${offset + index}`,
                      gatewayCostUsd: 0.5,
                    }),
                  })
                ),
              },
            ],
            evaluationTime
          )
        );
        assert.ok(Buffer.byteLength(body) < 1024 * 1024);
        const pushed = await request("/loki/api/v1/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        assert.equal(pushed.status, 204, await pushed.text());
        await delay(Math.ceil(Buffer.byteLength(body) / 2000));
      }
      const diagnostic = new URLSearchParams({
        query:
          'max_over_time({deployment_environment_name="rejection"} | json costId="costId", gatewayCostUsd="gatewayCostUsd" | unwrap gatewayCostUsd | __error__="" [5m])',
        time: String(evaluationTime),
      });
      const response = await request(`/loki/api/v1/query?${diagnostic}`);
      assert.equal(
        response.status,
        400,
        "Above-cap diagnostic must fail visibly"
      );
      assert.match(await response.text(), /maximum number of series/);
      const metrics = docker([
        "exec",
        name,
        "sh",
        "-c",
        "cat /sys/fs/cgroup/memory.peak /sys/fs/cgroup/memory.events",
      ]);
      console.log(`Loki cgroup (tmpfs included):\n${metrics}`);
      assert.ok(
        Number(metrics.split("\n")[0]) < 768 * 1024 * 1024,
        "Loki peak exceeds 768 MiB"
      );
      assert.match(metrics, /\noom 0\n/);
      assert.match(metrics, /\noom_kill 0\n/);
      console.log(
        `Capacity ${count} IDs + 100 replays / 7d / sequential; slowest ${Math.max(...timings).toFixed(1)}ms`
      );
    }
  } catch (error) {
    failure = error;
  } finally {
    if (capacity) {
      const metrics = spawn(
        "docker",
        [
          "exec",
          name,
          "sh",
          "-c",
          "cat /sys/fs/cgroup/memory.peak /sys/fs/cgroup/memory.events",
        ],
        { encoding: "utf8", timeout: 10_000 }
      );
      console.log(
        `Final cgroup evidence (tmpfs included):\n${metrics.stdout || metrics.stderr}`
      );
      const inspected = spawn(
        "docker",
        [
          "inspect",
          "--format",
          "OOMKilled={{.State.OOMKilled}} memory={{.HostConfig.Memory}} swap={{.HostConfig.MemorySwap}} CPUs={{.HostConfig.NanoCpus}}",
          name,
        ],
        { encoding: "utf8", timeout: 10_000 }
      );
      console.log(inspected.stdout || inspected.stderr);
    }
    const removed = spawn("docker", ["rm", "--force", name], {
      encoding: "utf8",
      timeout: 10_000,
    });
    // --rm may already have removed an exited container. Other cleanup failures
    // must be reported; never broaden removal beyond this random container name.
    if (
      (removed.error || removed.status !== 0) &&
      !removed.stderr?.includes("No such container")
    ) {
      const message = `Failed to remove disposable Loki ${name}: ${removed.error?.message || removed.stderr || removed.status}`;
      if (failure) {
        console.error(message);
      } else {
        failure = new Error(message);
      }
    }
    if (capacity) {
      const removedImage = spawn("docker", ["image", "rm", name], {
        encoding: "utf8",
        timeout: 10_000,
      });
      if (
        (removedImage.error || removedImage.status !== 0) &&
        !removedImage.stderr?.includes("No such image")
      ) {
        failure ??= new Error(
          `Failed to remove disposable image ${name}: ${removedImage.stderr}`
        );
      }
    }
  }
  if (failure) {
    throw failure;
  }
  console.log(
    `Passed ${fixtures.comparisons.length * fixtures.selections.length} native LogQL comparisons plus independent exact-vector expectations for accounting, runtime and API/MCP attribution.`
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    assert.ok(
      process.argv.slice(2).every((arg) => arg === "--cost-capacity"),
      "Unknown query-check argument"
    );
    await checkQueries(
      spawnSync,
      fetch,
      process.argv.includes("--cost-capacity")
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.exitCode || 1;
  }
}
