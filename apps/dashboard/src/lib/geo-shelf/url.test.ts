import { describe, expect, test } from "bun:test";

import {
  canonicalizeShelfUrl,
  isAllowedShelfUrl,
  isShelfRootUrl,
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

describe("shelf root URL detection", () => {
  test("treats bare origins as root URLs", () => {
    expect(isShelfRootUrl("https://e2b.dev/")).toBeTrue();
    expect(isShelfRootUrl("https://e2b.dev")).toBeTrue();
    expect(isShelfRootUrl("http://www.daytona.io/")).toBeTrue();
  });

  test("keeps pages with a path or query", () => {
    expect(isShelfRootUrl("https://e2b.dev/blog/sandboxes")).toBeFalse();
    expect(isShelfRootUrl("https://e2b.dev/?ref=x")).toBeFalse();
    expect(isShelfRootUrl("https://g2.com/categories/ai")).toBeFalse();
  });
});
