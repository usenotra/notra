import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

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

export async function checkQueries(spawn = spawnSync, fetchImpl = fetch) {
  function docker(args, timeout = 10_000) {
    const result = spawn("docker", args, { encoding: "utf8", timeout });
    if (result.error || result.status !== 0) {
      throw Object.assign(
        new Error(
          `Docker ${args[0]} failed: ${result.error?.message || result.stderr || result.signal || result.status}`
        ),
        { exitCode: result.status || 1 }
      );
    }
    return result.stdout;
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
  let failure;
  try {
    docker([
      "run",
      "--detach",
      "--rm",
      "--name",
      name,
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
      image,
      "-config.file=/etc/loki/notra.yml",
      "-ingester.wal-dir=/loki/wal",
    ]);
    const origin = loopbackOrigin(docker(["port", name, "3100/tcp"]));
    const deadline = Date.now() + 120_000;
    const request = async (path, options = {}) => {
      const remaining = deadline - Date.now();
      assert.ok(remaining > 0, "Loki query check deadline exceeded");
      const url = new URL(path, origin);
      assert.equal(url.origin, origin);
      assert.equal(url.hostname, "127.0.0.1");
      return fetchImpl(url, {
        ...options,
        redirect: "error",
        signal: AbortSignal.timeout(Math.min(5000, remaining)),
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
    const query = async (expression, selection) => {
      const params = new URLSearchParams({
        query: interpolateQuery(expression, selection, fixtures.range),
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
  } catch (error) {
    failure = error;
  } finally {
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
    await checkQueries();
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.exitCode || 1;
  }
}
