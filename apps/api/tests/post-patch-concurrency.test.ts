import { describe, expect, test } from "bun:test";

import {
  matchesPostUpdatedAt,
  normalizePostUpdatedAt,
  postUpdatedAtMatches,
} from "../src/utils/post-patch-concurrency";

function sqlContains(fragment: unknown, needle: string): boolean {
  if (!fragment || typeof fragment !== "object") {
    return false;
  }

  if ("queryChunks" in fragment && Array.isArray(fragment.queryChunks)) {
    return fragment.queryChunks.some((chunk) => sqlContains(chunk, needle));
  }

  if ("value" in fragment) {
    const value = (fragment as { value: unknown }).value;
    if (Array.isArray(value)) {
      return value.some((entry) => String(entry).includes(needle));
    }

    return String(value).includes(needle);
  }

  return String(fragment).includes(needle);
}

describe("postUpdatedAtMatches", () => {
  test("treats normalized timestamps as equal at millisecond precision", () => {
    expect(
      postUpdatedAtMatches(
        new Date("2026-01-01T00:00:00.123Z"),
        normalizePostUpdatedAt(new Date("2026-01-01T00:00:00.123Z"))
      )
    ).toBe(true);
  });

  test("detects changed rows", () => {
    expect(
      postUpdatedAtMatches(
        new Date("2026-01-01T00:00:00.456Z"),
        new Date("2026-01-01T00:00:00.123Z")
      )
    ).toBe(false);
  });
});

describe("matchesPostUpdatedAt", () => {
  test("compares postgres timestamps at millisecond precision", () => {
    expect(
      sqlContains(
        matchesPostUpdatedAt(new Date("2026-01-01T00:00:00.123Z")),
        "date_trunc"
      )
    ).toBe(true);
  });
});
