import { describe, expect, test } from "bun:test";

import {
  canonicalizeShelfUrl,
  isAllowedShelfUrl,
  shelfFetchUrl,
} from "@notra/schemas/utils/dashboard/shelf-url";

describe("shelf URL validation", () => {
  test("rejects URLs containing credentials", () => {
    const credentialUrls = [
      "https://user@example.com/article",
      "https://user:password@example.com/article",
      "https://:password@example.com/article",
    ];

    for (const url of credentialUrls) {
      expect(isAllowedShelfUrl(url)).toBeFalse();
      expect(() => canonicalizeShelfUrl(url)).toThrow();
      expect(() => shelfFetchUrl(url)).toThrow();
    }
  });

  test("continues to accept ordinary public hostname URLs", () => {
    expect(isAllowedShelfUrl("https://www.example.com/article")).toBeTrue();
  });

  test("rejects exact reserved hostname suffixes", () => {
    expect(isAllowedShelfUrl("https://home.arpa/article")).toBeFalse();
  });
});
