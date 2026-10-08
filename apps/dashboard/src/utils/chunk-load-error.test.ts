import { describe, expect, test } from "bun:test";

import { isChunkLoadError } from "./chunk-load-error";

describe("chunk load errors", () => {
  test("recognizes browser module failures and CSS preload failures", () => {
    for (const message of [
      "Failed to fetch dynamically imported module: https://app.example/assets/preview-old.js",
      "error loading dynamically imported module: https://app.example/assets/preview-old.js",
      "Importing a module script failed.",
      "Unable to preload CSS for /assets/preview-old.css",
    ]) {
      expect(isChunkLoadError(new TypeError(message))).toBe(true);
    }
    const error = new Error("Loading chunk 123 failed");
    error.name = "ChunkLoadError";
    expect(isChunkLoadError(error)).toBe(true);
  });

  test("does not hide ordinary application or API network errors", () => {
    for (const error of [
      new TypeError("Failed to fetch"),
      new Error("Unauthorized"),
      new Error("Cannot read properties of undefined"),
      null,
      "Failed to fetch dynamically imported module",
    ]) {
      expect(isChunkLoadError(error)).toBe(false);
    }
  });
});
