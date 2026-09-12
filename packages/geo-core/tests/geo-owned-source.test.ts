import { describe, expect, test } from "bun:test";

import { hasOwnedSourceCitation } from "../src/utils/geo-owned-source";

describe("hasOwnedSourceCitation", () => {
  test("matches the configured website domain", () => {
    expect(
      hasOwnedSourceCitation("https://brevo.com", [
        { url: "https://brevo.com/blog/email-marketing" },
      ])
    ).toBe(true);
  });

  test("matches docs and blog subdomains", () => {
    expect(
      hasOwnedSourceCitation("https://www.brevo.com/", [
        { url: "https://docs.brevo.com/getting-started" },
      ])
    ).toBe(true);
  });

  test("matches additional domain aliases", () => {
    expect(
      hasOwnedSourceCitation(
        "https://brevo.com",
        [{ url: "https://help.brevo.dev/article" }],
        ["Brevo", "brevo.dev"]
      )
    ).toBe(true);
  });

  test("does not match domains that only share a suffix", () => {
    expect(
      hasOwnedSourceCitation("https://brevo.com", [
        { url: "https://notbrevo.com/review" },
      ])
    ).toBe(false);
  });

  test("ignores missing websites and malformed sources", () => {
    expect(hasOwnedSourceCitation(null, [{ url: "https://brevo.com" }])).toBe(
      false
    );
    expect(
      hasOwnedSourceCitation("https://brevo.com", [{ url: "https://" }])
    ).toBe(false);
  });
});
