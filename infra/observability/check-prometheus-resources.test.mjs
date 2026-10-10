import assert from "node:assert/strict";
import { test } from "node:test";

import { checkPrometheusResources } from "./check-prometheus-resources.mjs";

test("Prometheus resource failure keeps listeners loopback, mounts fixture-only inputs and cleans exact run names", async () => {
  const calls = [];
  await assert.rejects(
    checkPrometheusResources(
      (_binary, args, options) => {
        assert.ok(options.timeout > 0 && options.timeout <= 120_000);
        calls.push(args);
        return {
          status: 0,
          stdout: args[0] === "port" ? "127.0.0.1:32768\n" : "fixture",
        };
      },
      async (url, options) => {
        assert.equal(url.origin, "http://127.0.0.1:32768");
        assert.equal(options.redirect, "error");
        assert.ok(options.signal instanceof AbortSignal);
        return new Response("ready");
      }
    ),
    /65534/
  );
  const run = calls.find(
    (args) => args[0] === "run" && args.includes("--publish")
  );
  const name = run[run.indexOf("--name") + 1];
  assert.match(name, /^notra-prometheus-resources-[a-f0-9-]{36}-normal$/);
  const prefix = name.replace(/-normal$/, "");
  assert.equal(run[run.indexOf("--publish") + 1], "127.0.0.1::9090");
  assert.match(
    run[run.indexOf("--mount") + 1],
    /\.artifacts\/prometheus-fixtures-[\w-]+\/prometheus.yml,target=\/etc\/prometheus\/prometheus.yml,readonly$/
  );
  assert.ok(
    run.includes("--memory=1g") &&
      run.includes("--memory-swap=1g") &&
      run.includes("--cpus=2")
  );
  assert.ok(
    !run.includes("--env") &&
      !run.includes("--env-file") &&
      !run.includes("--volume")
  );
  const exporter = calls.find(
    (args) => args[0] === "run" && !args.includes("--publish")
  );
  assert.ok(
    exporter.includes("--read-only") && exporter.includes("--cap-drop=ALL")
  );
  assert.deepEqual(calls.slice(-5), [
    ["rm", "--force", `${prefix}-exporter`],
    ["rm", "--force", `${prefix}-normal`],
    ["rm", "--force", `${prefix}-reject`],
    ["network", "rm", `${prefix}-network`],
    ["image", "rm", prefix],
  ]);
});
