import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { ChunkLoadBoundary } from "./chunk-load-boundary";

describe("chunk load boundary", () => {
  test("renders children until a module import fails", () => {
    const children = <p>Chat remains usable</p>;
    const boundary = new ChunkLoadBoundary({ children });
    expect(boundary.render()).toBe(children);
    boundary.state = ChunkLoadBoundary.getDerivedStateFromError(
      new TypeError(
        "Failed to fetch dynamically imported module: /assets/old.js"
      )
    );
    expect(boundary.render()).not.toBe(children);
  });

  test("propagates ordinary rendering failures to the route boundary", () => {
    const boundary = new ChunkLoadBoundary({ children: null });
    const error = new Error("Unexpected preview state");
    boundary.state = ChunkLoadBoundary.getDerivedStateFromError(error);
    expect(() => boundary.render()).toThrow(error);
  });

  for (const scenario of ["chunk", "ordinary"]) {
    test(`handles ${scenario} failures in a mounted React tree`, () => {
      const result = spawnSync(
        process.execPath,
        [
          fileURLToPath(
            new URL(
              "../../tests/fixtures/chunk-load-boundary.fixture.tsx",
              import.meta.url
            )
          ),
          scenario,
        ],
        {
          env: { ...process.env, NODE_ENV: "development" },
          encoding: "utf8",
        }
      );
      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
    });
  }
});
