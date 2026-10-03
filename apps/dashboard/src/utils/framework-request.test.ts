import { describe, expect, test } from "bun:test";

import { DASHBOARD_FUNCTION_RULES } from "../constants/framework";
import {
  getDashboardRedirect,
  getDashboardSecurityHeaders,
} from "./framework-request";

describe("dashboard runtime redirects", () => {
  test.each([
    ["/home?source=demo", "https://www.usenotra.com/home?source=demo", 308],
    ["/landing", "https://www.usenotra.com/landing", 308],
    ["/acme/settings?tab=billing", "/acme?tab=billing&settings=general", 307],
    ["/acme/logs", "/acme?settings=logs", 307],
    ["/acme/schedules", "/acme/automation/schedules", 308],
    [
      "/acme/automation/schedule?test=1",
      "/acme/automation/schedules?test=1",
      308,
    ],
  ])("preserves redirect %s", (path, destination, status) => {
    const response = getDashboardRedirect(
      new Request(`http://localhost${path}`)
    );
    expect(response?.status).toBe(status);
    expect(response?.headers.get("location")).toBe(destination);
  });

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

  test.each(["/", "/acme", "/api/healthcheck", "/api-keys", "/acme/geo/gaps"])(
    "leaves current route %s alone",
    (path) => {
      expect(
        getDashboardRedirect(new Request(`http://localhost${path}`))
      ).toBeUndefined();
    }
  );
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

  test("retains long-lived chat and agent deployment durations", () => {
    expect(
      DASHBOARD_FUNCTION_RULES["/api/organizations/*/chat"].maxDuration
    ).toBe(1800);
    expect(
      DASHBOARD_FUNCTION_RULES["/api/organizations/*/agent/**"].maxDuration
    ).toBe(800);
    expect(DASHBOARD_FUNCTION_RULES["/api/cron/geo-scan"].maxDuration).toBe(
      300
    );
  });
});
