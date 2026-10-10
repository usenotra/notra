import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("Effect lint and compiler diagnostics reject bugs without blocking warnings", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const cache = `${root}packages/tools/.cache/`;
  mkdirSync(cache, { recursive: true });
  const directory = mkdtempSync(`${cache}effect-diagnostics-`);
  const project = `${directory}/tsconfig.json`;
  const source = `${directory}/fixture.ts`;
  const lint = () =>
    spawnSync(
      "bun",
      [
        "x",
        "--no-install",
        "oxlint",
        "--format",
        "agent",
        "--config",
        "oxlint.effect.config.ts",
        "--tsconfig",
        project,
        "--threads=2",
        source,
      ],
      { cwd: root, encoding: "utf8", timeout: 30_000 }
    );
  const typecheck = () =>
    spawnSync(
      "bun",
      ["x", "--no-install", "tsc", "--project", project, "--pretty", "false"],
      { cwd: root, encoding: "utf8", timeout: 30_000 }
    );

  try {
    writeFileSync(
      project,
      JSON.stringify({
        extends: `${root}packages/typescript-config/base.json`,
        compilerOptions: {
          noEmit: true,
          declaration: false,
          declarationMap: false,
          module: "ESNext",
          moduleResolution: "Bundler",
        },
        files: ["fixture.ts"],
      })
    );
    writeFileSync(
      source,
      'import { Effect } from "effect";\nexport const valid = Effect.gen(function* () { yield* Effect.log("valid"); });'
    );
    let result = lint();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    result = typecheck();
    assert.equal(result.status, 0, result.stdout + result.stderr);

    writeFileSync(
      source,
      'import { Effect } from "effect";\nEffect.log("never executed");'
    );
    result = lint();
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(
      result.stdout + result.stderr,
      /error effecttsgo\(floating-effect\)/
    );
    result = typecheck();
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(
      result.stdout + result.stderr,
      /^.*error TS\d+:.*effect\(floatingEffect\)$/m
    );

    writeFileSync(
      source,
      `import { Effect } from "effect";
export const missingStar = Effect.gen(function* () { yield Effect.void; });
export const outdated = Effect.catchAll(Effect.fail("error"), () => Effect.void);
`
    );
    result = lint();
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(
      result.stdout + result.stderr,
      /error effecttsgo\(missing-star-in-yield-effect-gen\)/
    );
    assert.match(
      result.stdout + result.stderr,
      /error effecttsgo\(outdated-api\)/
    );
    result = typecheck();
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(
      result.stdout + result.stderr,
      /^.*error TS\d+:.*effect\(missingStarInYieldEffectGen\)$/m
    );
    assert.match(
      result.stdout + result.stderr,
      /^.*error TS\d+:.*effect\(outdatedApi\)$/m
    );

    writeFileSync(
      source,
      `import { Context, Effect, Layer } from "effect";
export const nested = Effect.gen(function* () {
  yield* Effect.void;
  return Effect.succeed(1);
});
export const hidden: Effect.Effect<void> = Effect.succeed(Effect.log("nested"));
export const promise = Effect.succeed(Promise.resolve(1));
export const unsafe = Effect.fail("error") as Effect.Effect<never>;
class A extends Context.Service<A>()("A", { make: Effect.succeed({}) }) {
  static Default = Layer.effect(this, this.make);
}
class B extends Context.Service<B>()("B", { make: Effect.as(A, {}) }) {
  static Default = Layer.effect(this, this.make);
}
export const dependent = Layer.mergeAll(A.Default, B.Default);
`
    );
    result = lint();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    for (const rule of [
      "return-effect-in-gen",
      "effect-in-void-success",
      "promise-in-effect-success",
      "unsafe-effect-type-assertion",
      "layer-merge-all-with-dependencies",
    ]) {
      assert.match(
        result.stdout + result.stderr,
        new RegExp(`warning effecttsgo\\(${rule}\\)`)
      );
    }
    result = typecheck();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    for (const rule of [
      "returnEffectInGen",
      "effectInVoidSuccess",
      "promiseInEffectSuccess",
      "unsafeEffectTypeAssertion",
      "layerMergeAllWithDependencies",
    ]) {
      assert.match(
        result.stdout + result.stderr,
        new RegExp(`^.*warning TS\\d+:.*effect\\(${rule}\\)$`, "m")
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
