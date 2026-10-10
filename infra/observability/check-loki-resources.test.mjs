import assert from "node:assert/strict";
import { test } from "node:test";

import { checkLokiResources } from "./check-loki-resources.mjs";

test("Loki recovery gate bounds Docker/HTTP, mounts only its fixture volume and cleans its exact names on failure", async () => {
  const calls = [];
  await assert.rejects(
    checkLokiResources(
      (_binary, args, options) => {
        assert.ok(options.timeout > 0 && options.timeout <= 300_000);
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
    /10001/
  );
  const run = calls.find(([command]) => command === "run");
  const name = run[run.indexOf("--name") + 1];
  assert.match(name, /^notra-loki-resources-[a-f0-9-]{36}-first$/);
  const prefix = name.replace(/-first$/, "");
  assert.equal(run[run.indexOf("--publish") + 1], "127.0.0.1::3100");
  assert.equal(
    run[run.indexOf("--mount") + 1],
    `type=volume,source=${prefix}-volume,target=/loki`
  );
  assert.ok(
    run.includes("--memory=1g") &&
      run.includes("--memory-swap=1g") &&
      run.includes("--cpus=2")
  );
  assert.ok(
    run.includes("--cap-drop=ALL") &&
      run.includes("--security-opt=no-new-privileges")
  );
  assert.ok(
    !run.includes("--env") &&
      !run.includes("--env-file") &&
      !run.includes("--entrypoint")
  );
  assert.deepEqual(calls.slice(-4), [
    ["rm", "--force", `${prefix}-first`],
    ["rm", "--force", `${prefix}-replay`],
    ["volume", "rm", `${prefix}-volume`],
    ["image", "rm", prefix],
  ]);
});
