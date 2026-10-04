import { describe, expect, test } from "bun:test";

import {
  getDashboardRedirect,
  getDashboardSecurityHeaders,
} from "./framework-request";

describe("dashboard runtime redirects", () => {
  test("restores the organization only from a valid cookie slug", () => {
    const response = getDashboardRedirect(
      new Request("http://localhost/api-keys?source=settings", {
        headers: { cookie: "other=1; notra_last_organization=acme-team" },
      })
    );
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "/acme-team/api-keys?source=settings"
    );
    for (const slug of ["", "//evil.example", "acme%2Fother", "acme.other"]) {
      expect(
        getDashboardRedirect(
          new Request("http://localhost/api-keys", {
            headers: { cookie: `notra_last_organization=${slug}` },
          })
        )
      ).toBeUndefined();
    }
  });
});

describe("dashboard deployment security", () => {
  test("denies embedding outside demo mode", () => {
    const headers = getDashboardSecurityHeaders(false);
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Content-Security-Policy"]).toBe("frame-ancestors 'none'");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  test("allows only the existing landing-page origins in demo mode", () => {
    const headers = getDashboardSecurityHeaders(true);
    expect(headers["X-Frame-Options"]).toBeUndefined();
    expect(headers["Content-Security-Policy"]).toBe(
      "frame-ancestors https://www.usenotra.com http://localhost:*"
    );
    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains; preload"
    );
  });
});
