import { describe, expect, test } from "bun:test";

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
});
