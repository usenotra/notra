import { expect, test } from "bun:test";

import { Effect } from "effect";

import { runSitesEffect } from "../src/utils/run-sites-effect";

test("Promise adapters preserve values, exact typed failures and programmer defects", async () => {
  expect(await runSitesEffect(Effect.succeed(42))).toBe(42);
  for (const error of [
    new Error("failure"),
    "opaque failure",
    { kind: "failure" },
  ]) {
    await expect(runSitesEffect(Effect.fail(error))).rejects.toBe(error);
    await expect(runSitesEffect(Effect.die(error))).rejects.toBe(error);
  }
});
