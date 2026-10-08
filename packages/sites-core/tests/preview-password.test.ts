import { describe, expect, test } from "bun:test";

import { SITE_PREVIEW_PASSWORD_ITERATIONS } from "@notra/sites-core/constants/sites";
import {
  hashPreviewPassword,
  verifyPreviewPassword,
} from "@notra/sites-core/utils/preview-password";
import { safePreviewNextPath } from "@notra/sites-core/utils/preview-path";

describe("preview password hashing", () => {
  test("stores a salted hash, never the password, and verifies only the right one", async () => {
    const stored = await hashPreviewPassword("s3cret-préview");
    expect(JSON.stringify(stored)).not.toContain("s3cret");
    expect(stored.iterations).toBe(SITE_PREVIEW_PASSWORD_ITERATIONS);
    expect(await verifyPreviewPassword("s3cret-préview", stored)).toBe(true);
    expect(await verifyPreviewPassword("s3cret-préview", stored)).toBe(true);
    expect(await verifyPreviewPassword("s3cret-preview", stored)).toBe(false);
    expect(await verifyPreviewPassword("", stored)).toBe(false);
  });

  test("the same password hashes differently each time, with a new version", async () => {
    const first = await hashPreviewPassword("same password");
    const second = await hashPreviewPassword("same password");
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
    expect(first.version).not.toBe(second.version);
  });

  test("tampered or broken records never verify", async () => {
    const stored = await hashPreviewPassword("password one");
    expect(
      await verifyPreviewPassword("password one", {
        ...stored,
        hash: stored.hash.slice(0, -4),
      })
    ).toBe(false);
    expect(
      await verifyPreviewPassword("password one", { ...stored, salt: "%%%" })
    ).toBe(false);
    expect(
      await verifyPreviewPassword("password one", {
        ...stored,
        iterations: SITE_PREVIEW_PASSWORD_ITERATIONS * 10,
      })
    ).toBe(false);
  });
});

describe("safePreviewNextPath", () => {
  test("keeps same-host paths and drops everything that could leave the host", () => {
    expect(safePreviewNextPath("/blog/post?x=1#top")).toBe(
      "/blog/post?x=1#top"
    );
    expect(safePreviewNextPath("/blog/../changelog")).toBe("/changelog");
    for (const unsafe of [
      null,
      "",
      "blog",
      "//evil.example.com",
      "/\\evil.example.com",
      "https://evil.example.com/",
      "data:text/html,hi",
    ]) {
      expect(safePreviewNextPath(unsafe)).toBe("/");
    }
  });
});
