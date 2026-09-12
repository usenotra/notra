import { describe, expect, test } from "bun:test";

import {
  formatTrafficLocation,
  isKnownTrafficHost,
  matchesProjectHost,
  normalizeProjectDomain,
  normalizeProjectDomains,
  trafficLogHostFilter,
  trafficQueryHost,
} from "../src/utils/geo-project-domains";

describe("normalizeProjectDomain", () => {
  test("strips protocol, www, path and port", () => {
    expect(normalizeProjectDomain("https://www.Docs.Example.com/blog")).toBe(
      "docs.example.com"
    );
    expect(normalizeProjectDomain("example.com:443")).toBe("example.com");
  });

  test("rejects empty values and bare hostnames", () => {
    expect(normalizeProjectDomain("")).toBeNull();
    expect(normalizeProjectDomain("localhost")).toBeNull();
    expect(normalizeProjectDomain("not a domain")).toBeNull();
  });
});

describe("normalizeProjectDomains", () => {
  test("dedupes and drops invalid entries", () => {
    expect(
      normalizeProjectDomains([
        "https://Example.com",
        "www.example.com",
        "docs.example.com",
        "nope",
        "",
      ])
    ).toEqual(["example.com", "docs.example.com"]);
  });

  test("caps the list", () => {
    expect(normalizeProjectDomains(["a.com", "b.com", "c.com"], 2)).toEqual([
      "a.com",
      "b.com",
    ]);
  });
});

describe("matchesProjectHost", () => {
  test("matches the listed host and its subdomains", () => {
    expect(matchesProjectHost("docs.example.com", ["example.com"])).toBe(true);
    expect(matchesProjectHost("www.example.com", ["example.com"])).toBe(true);
    expect(matchesProjectHost("example.com", ["example.com"])).toBe(true);
  });

  test("strips www on the selected domain so subdomains still match", () => {
    expect(matchesProjectHost("docs.example.com", ["www.example.com"])).toBe(
      true
    );
    expect(matchesProjectHost("example.com", ["www.example.com"])).toBe(true);
    expect(
      matchesProjectHost("www.docs.example.com", ["www.example.com"])
    ).toBe(true);
  });

  test("does not match sibling hosts", () => {
    expect(matchesProjectHost("notexample.com", ["example.com"])).toBe(false);
    expect(matchesProjectHost("example.com", ["docs.example.com"])).toBe(false);
  });

  test("an empty list matches nothing", () => {
    expect(matchesProjectHost("example.com", [])).toBe(false);
  });
});

describe("formatTrafficLocation", () => {
  test("joins host and path", () => {
    expect(formatTrafficLocation("docs.example.com", "/blog")).toBe(
      "docs.example.com/blog"
    );
    expect(formatTrafficLocation("", "pricing")).toBe("/pricing");
  });
});

describe("trafficLogHostFilter", () => {
  test("normalizes a URL to a hostname", () => {
    expect(trafficLogHostFilter("https://www.Docs.Example.com/blog")).toBe(
      "docs.example.com"
    );
  });

  test("treats empty and all as no filter", () => {
    expect(trafficLogHostFilter("")).toBe("");
    expect(trafficLogHostFilter("all")).toBe("");
    expect(trafficLogHostFilter(undefined)).toBe("");
  });
});

describe("isKnownTrafficHost", () => {
  test("keeps a selected host that appears in the list", () => {
    expect(
      isKnownTrafficHost("example.com", ["example.com", "docs.example.com"])
    ).toBe(true);
  });

  test("keeps a parent host when only subdomain traffic is present", () => {
    expect(isKnownTrafficHost("example.com", ["docs.example.com"])).toBe(true);
    expect(isKnownTrafficHost("www.example.com", ["docs.example.com"])).toBe(
      true
    );
  });

  test("rejects a host that is not in the current list", () => {
    expect(isKnownTrafficHost("other.com", ["example.com"])).toBe(false);
    expect(isKnownTrafficHost("other.com", [])).toBe(false);
  });
});

describe("trafficQueryHost", () => {
  test("preserves the host until readiness is confirmed", () => {
    expect(trafficQueryHost("www.Docs.Example.com", [], false)).toBe(
      "docs.example.com"
    );
    expect(trafficQueryHost("other.com", ["example.com"])).toBe("other.com");
  });

  test("drops a host that is not in the current project list", () => {
    expect(trafficQueryHost("other.com", ["example.com"], true)).toBe("");
  });

  test("keeps a parent host when only subdomain rows exist", () => {
    expect(
      trafficQueryHost("www.example.com", ["docs.example.com"], true)
    ).toBe("example.com");
  });
});
