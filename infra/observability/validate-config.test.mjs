import assert from "node:assert/strict";
import { test } from "node:test";

import {
  upstreamImage,
  validateConfigs,
  validationCommands,
} from "./validate-config.mjs";

test("native validators are digest-pinned, networkless and cannot mount production storage or credentials", () => {
  const commands = validationCommands();
  assert.deepEqual(
    commands.map(({ service }) => service),
    ["prometheus", "loki", "collector"]
  );
  for (const { service, args } of commands) {
    assert.deepEqual(args.slice(0, 4), ["run", "--rm", "--network", "none"]);
    assert.ok(args.includes("--read-only") && args.includes("--cap-drop=ALL"));
    assert.ok(args.includes("--security-opt=no-new-privileges"));
    assert.match(
      args[args.indexOf("--entrypoint") + 2],
      /@sha256:[a-f0-9]{64}$/
    );
    assert.equal(args.filter((arg) => arg === "--mount").length, 1);
    assert.ok(args[args.indexOf("--mount") + 1].endsWith(",readonly"));
    assert.ok(
      !args.includes("--volume") &&
        !args.includes("--env-file") &&
        !args.includes("--publish")
    );
    if (service === "collector") {
      assert.equal(args[args.indexOf("--user") + 1], "10001:10001");
      assert.match(
        args[args.indexOf("--tmpfs") + 1],
        /^\/var\/lib\/otelcol:rw,.*uid=10001/
      );
      assert.equal(
        args[args.indexOf("--env") + 1],
        "NOTRA_OTLP_TOKEN=notra-config-validation-fixture-only"
      );
    } else {
      assert.ok(!args.includes("--env"));
    }
  }
  assert.throws(
    () => upstreamImage("FROM grafana/loki:latest AS upstream", "grafana/loki"),
    /digest-pinned/
  );
});

test("native validation cannot skip a missing daemon or continue after a failed validator", () => {
  assert.throws(
    () => validateConfigs(() => ({ status: 1 })),
    /Docker is unavailable.*not skipped/
  );
  let calls = 0;
  assert.throws(
    () => validateConfigs(() => ({ status: ++calls === 1 ? 0 : 42 })),
    (error) =>
      error.exitCode === 42 &&
      /prometheus native config validation failed/.test(error.message)
  );
  assert.equal(calls, 2);
});
