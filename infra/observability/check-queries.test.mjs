import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkQueries,
  compareVectors,
  interpolateQuery,
  loopbackOrigin,
  pushPayload,
} from "./check-queries.mjs";
import { costCapacityStreams } from "./utils/cost-capacity.mjs";

test("cost fixture generator preserves stable replay IDs, org split and bounded chronological batches", () => {
  for (const [count, capacity] of [
    [600, false],
    [50_000, true],
  ]) {
    const streams = costCapacityStreams(count, capacity);
    const entries = streams.flatMap(({ entries: records }) => records);
    const records = entries.map(({ line }) => JSON.parse(line));
    assert.equal(records.length, count + 100);
    assert.equal(new Set(records.map(({ costId }) => costId)).size, count);
    assert.equal(
      records.filter(
        ({ organizationId }) => organizationId === "org_capacity_b"
      ).length,
      count / 2
    );
    for (const record of records) {
      assert.equal(record.gatewayCostUsd, 0.5);
      assert.equal(record.byokInferenceCostUsd, 1);
      assert.equal(record.costUsd, 1.5);
    }
    for (const stream of streams) {
      assert.ok(
        Buffer.byteLength(
          JSON.stringify(pushPayload([stream], 1_800_000_000_000_000_000n))
        ) <
          1024 * 1024
      );
      assert.equal(stream.labels.deployment_environment_name, "capacity");
    }
    assert.ok(entries[0].ageSeconds >= entries.at(-1).ageSeconds);
  }
});

test("query interpolation escapes environment and preserves raw fixture lines in timestamp order", () => {
  assert.equal(
    interpolateQuery(
      `"\${environment}" \${organization:raw} $__range $__auto`,
      {
        environment: 'a"b',
        organization: "org_(alpha|beta)",
      }
    ),
    '"a\\"b" org_(alpha|beta) 5m 5m'
  );
  assert.throws(
    () =>
      interpolateQuery("$__unknown", {
        environment: "validation",
        organization: ".*",
      }),
    /Unresolved/
  );
  const time = 1_800_000_000_000_000_000n;
  assert.deepEqual(
    pushPayload(
      [
        {
          labels: {},
          entries: [
            { ageSeconds: 0, line: "{not-json}" },
            { ageSeconds: 2, line: '{"ev\\u0065nt":"other"}' },
          ],
        },
      ],
      time
    ).streams[0].values,
    [
      [String(time - 2_000_000_000n), '{"ev\\u0065nt":"other"}'],
      [String(time), "{not-json}"],
    ]
  );
});

test("vector comparison respects labels, zero and tolerance but rejects missing, duplicate or erroneous results", () => {
  const expected = [{ metric: { model: "a" }, value: [0, 0] }];
  compareVectors(
    [{ metric: { model: "a" }, value: [123, "0.0000000005"] }],
    expected,
    ["model"]
  );
  assert.throws(() => compareVectors([], expected, ["model"]));
  assert.throws(
    () => compareVectors([...expected, ...expected], expected, ["model"]),
    /Duplicate/
  );
  assert.throws(
    () => compareVectors([{ metric: {}, value: [0, "NaN"] }], [], []),
    /Non-finite/
  );
  assert.throws(
    () =>
      compareVectors(
        [{ metric: { __error__: "JSONParserErr" }, value: [0, 1] }],
        [],
        []
      ),
    /Unexpected result label/
  );
  assert.throws(
    () =>
      compareVectors([{ metric: { model: "a" }, value: [0, 1] }], expected, [
        "model",
      ]),
    /Sample mismatch/
  );
});

test("native query checks cannot start or issue HTTP without Docker or a validated loopback origin", async () => {
  assert.equal(loopbackOrigin("127.0.0.1:32768\n"), "http://127.0.0.1:32768");
  assert.throws(() => loopbackOrigin("0.0.0.0:3100"));
  assert.throws(() => loopbackOrigin("127.0.0.1:65536"));
  let calls = 0;
  await assert.rejects(
    checkQueries(
      () => {
        calls++;
        return { status: 1 };
      },
      () => assert.fail("No HTTP without Docker")
    ),
    /Docker is required.*not skipped/
  );
  assert.equal(calls, 1);
});

test("query failure removes only its disposable container and keeps requests local and credential-free", async () => {
  for (const capacity of [false, true]) {
    const calls = [];
    await assert.rejects(
      checkQueries(
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
          if (url.pathname === "/ready") {
            return new Response("ready");
          }
          if (url.pathname === "/loki/api/v1/push") {
            return new Response(null, { status: 204 });
          }
          return new Response("fixture query failed", { status: 400 });
        },
        capacity
      ),
      /Loki query failed/
    );
    const run = calls.find(([command]) => command === "run");
    const name = run[run.indexOf("--name") + 1];
    assert.match(name, /^notra-query-fixtures-[a-f0-9-]{36}$/);
    assert.deepEqual(calls.at(capacity ? -2 : -1), ["rm", "--force", name]);
    if (capacity) {
      assert.deepEqual(calls.at(-1), ["image", "rm", name]);
      assert.ok(
        run.includes("--memory=1g") &&
          run.includes("--memory-swap=1g") &&
          run.includes("--cpus=2")
      );
    }
    assert.equal(run[run.indexOf("--publish") + 1], "127.0.0.1::3100");
    assert.ok(run.includes("--read-only") && run.includes("--cap-drop=ALL"));
    assert.equal(run[run.indexOf("--user") + 1], "10001:10001");
    assert.ok(run[run.indexOf("--mount") + 1].endsWith(",readonly"));
    assert.ok(
      !run.includes("--env") &&
        !run.includes("--env-file") &&
        !run.includes("--volume")
    );
  }
});
