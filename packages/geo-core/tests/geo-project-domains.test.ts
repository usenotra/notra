import { describe, expect, test } from "bun:test";

import {
  acceptsIngestHost,
  ingestAllowedHosts,
  matchesProjectHost,
  normalizeProjectDomain,
  normalizeProjectDomains,
} from "../src/utils/geo-project-domains";

describe("normalizeProjectDomain", () => {
  test("strips protocol, www, path and port", () => {
    expect(normalizeProjectDomain("https://www.Docs.Example.com/blog")).toBe(
      "docs.example.com"
    );
    expect(normalizeProjectDomain("example.com:443")).toBe("example.com");
  });

  test("canonicalizes Unicode/IDN hosts to punycode", () => {
    expect(normalizeProjectDomain("https://bücher.de")).toBe(
      "xn--bcher-kva.de"
    );
    expect(normalizeProjectDomain("https://www.Bücher.de/path")).toBe(
      "xn--bcher-kva.de"
    );
    expect(normalizeProjectDomain("xn--bcher-kva.de")).toBe("xn--bcher-kva.de");
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
});

describe("ingestAllowedHosts", () => {
  test("includes the brand website and extra tracked domains", () => {
    expect(
      ingestAllowedHosts("https://www.Example.com/blog", [
        "docs.example.com",
        "https://www.example.com",
      ])
    ).toEqual(["example.com", "docs.example.com"]);
  });

  test("returns an empty list when nothing is configured", () => {
    expect(ingestAllowedHosts(null)).toEqual([]);
    expect(ingestAllowedHosts("", ["not a domain"])).toEqual([]);
  });

  test("keeps Unicode brand sites on the punycode allowlist", () => {
    expect(ingestAllowedHosts("https://bücher.de")).toEqual([
      "xn--bcher-kva.de",
    ]);
  });
});

describe("acceptsIngestHost", () => {
  test("fails open when the allowlist could not be loaded", () => {
    expect(acceptsIngestHost("attacker.example", null)).toBe(true);
  });

  test("still rejects hostless and invalid hosts when failing open", () => {
    expect(acceptsIngestHost("", null)).toBe(false);
    expect(acceptsIngestHost("localhost", null)).toBe(false);
    expect(acceptsIngestHost("not a domain", null)).toBe(false);
  });

  test("rejects every host when the loaded allowlist is empty", () => {
    expect(acceptsIngestHost("example.com", [])).toBe(false);
  });

  test("accepts the brand host and listed extras, including subdomains", () => {
    const allowed = ingestAllowedHosts("https://example.com", [
      "docs.example.com",
    ]);
    expect(acceptsIngestHost("www.example.com", allowed)).toBe(true);
    expect(acceptsIngestHost("docs.example.com", allowed)).toBe(true);
    expect(acceptsIngestHost("status.docs.example.com", allowed)).toBe(true);
    expect(acceptsIngestHost("attacker.com", allowed)).toBe(false);
  });

  test("accepts punycode event hosts for a Unicode brand site", () => {
    const allowed = ingestAllowedHosts("https://bücher.de");
    expect(acceptsIngestHost("xn--bcher-kva.de", allowed)).toBe(true);
    expect(acceptsIngestHost("www.xn--bcher-kva.de", allowed)).toBe(true);
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
