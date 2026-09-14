import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import { computeSkillContentHash } from "./hash";
import {
  isSystemSkillVersionPublished,
  nextSystemSkillVersion,
} from "./versions";

const SHA256_HEX_LENGTH = 64;
const HEX_REGEX = /^[0-9a-f]+$/;

describe("computeSkillContentHash", () => {
  test("is a stable sha256 hex digest", () => {
    const hash = computeSkillContentHash("desc", "content");

    expect(hash).toHaveLength(SHA256_HEX_LENGTH);
    expect(hash).toMatch(HEX_REGEX);
    expect(hash).toBe(computeSkillContentHash("desc", "content"));
  });

  test("changes when either the description or the content changes", () => {
    const base = computeSkillContentHash("desc", "content");

    expect(computeSkillContentHash("other", "content")).not.toBe(base);
    expect(computeSkillContentHash("desc", "other")).not.toBe(base);
  });

  test('digests exactly `description + "\\n" + content`', () => {
    expect(computeSkillContentHash("desc", "content")).toBe(
      createHash("sha256").update("desc\ncontent").digest("hex")
    );
  });

  test("keeps whitespace significant", () => {
    expect(computeSkillContentHash("desc", "content ")).not.toBe(
      computeSkillContentHash("desc", "content")
    );
  });
});

describe("nextSystemSkillVersion", () => {
  test("starts at 1 for an unpublished name", () => {
    expect(nextSystemSkillVersion(null)).toBe(1);
  });

  test("increments the head version", () => {
    expect(nextSystemSkillVersion({ version: 1 })).toBe(2);
    expect(nextSystemSkillVersion({ version: 41 })).toBe(42);
  });
});

describe("isSystemSkillVersionPublished", () => {
  test("republishing identical bytes is a no-op", () => {
    expect(isSystemSkillVersionPublished({ contentHash: "abc" }, "abc")).toBe(
      true
    );
  });

  test("a changed hash or a missing head publishes", () => {
    expect(isSystemSkillVersionPublished({ contentHash: "abc" }, "def")).toBe(
      false
    );
    expect(isSystemSkillVersionPublished(null, "abc")).toBe(false);
  });
});
