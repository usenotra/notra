import { describe, expect, test } from "bun:test";

import {
  matchesPostUpdatedAt,
  normalizePostUpdatedAt,
  postUpdatedAtMatches,
} from "../src/utils/post-patch-concurrency";

function collectSqlText(fragment: unknown): string {
  if (fragment instanceof Date) {
    return fragment.toISOString();
  }

  if (!fragment || typeof fragment !== "object") {
    return String(fragment);
  }

  if ("queryChunks" in fragment && Array.isArray(fragment.queryChunks)) {
    return fragment.queryChunks.map(collectSqlText).join("");
  }

  if (
    "name" in fragment &&
    typeof (fragment as { name: unknown }).name === "string"
  ) {
    return (fragment as { name: string }).name;
  }

  if ("value" in fragment) {
    const value = (fragment as { value: unknown }).value;
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry)).join("");
    }

    return String(value);
  }

  return String(fragment);
}

describe("postUpdatedAtMatches", () => {
  test("matches separate Date instances with the same millisecond", () => {
    const prepared = new Date("2026-01-01T00:00:00.123Z");
    const freshRead = new Date(prepared);

    expect(prepared).not.toBe(freshRead);
    expect(postUpdatedAtMatches(freshRead, prepared)).toBe(true);
    expect(
      postUpdatedAtMatches(freshRead, normalizePostUpdatedAt(prepared))
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
  test("truncates updated_at and binds the expected millisecond timestamp", () => {
    const expected = new Date("2026-01-01T00:00:00.123Z");
    const sql = collectSqlText(matchesPostUpdatedAt(expected));

    expect(sql).toContain("date_trunc");
    expect(sql).toContain("updated_at");
    expect(sql).toContain(expected.toISOString());
  });
});
