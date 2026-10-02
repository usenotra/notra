import { describe, expect, test } from "bun:test";

import * as healthcheck from "../../src/app/api/healthcheck/route";
import { NON_DASHBOARD_PATH } from "../../src/constants/auth-routes";
import {
  buildPostAuthRedirectPath,
  sanitizeReturnTo,
} from "../../src/lib/auth/return-to";
import { dispatchRouteHandler } from "../../src/lib/auth/route-handler";
import { buildSessionCorsHeaders } from "../../src/lib/auth/session-cors";
import { negotiateDashboardLocale } from "../../src/utils/i18n";
import { evaluateLocalDevAuth } from "../../src/utils/local-dev-auth";

describe("migration executable security contracts", () => {
  test("real healthcheck survives GET, HEAD, OPTIONS and unsupported method dispatch", async () => {
    const get = await dispatchRouteHandler(
      healthcheck,
      new Request("http://127.0.0.1/api/healthcheck")
    );
    expect(get.status).toBe(200);
    expect(get.headers.get("cache-control")).toBe("no-store");
    const data = await get.json();
    expect(data.ok).toBe(true);
    expect(Number.isNaN(Date.parse(data.time))).toBe(false);
    const head = await dispatchRouteHandler(
      healthcheck,
      new Request("http://127.0.0.1/api/healthcheck", { method: "HEAD" })
    );
    expect(head.status).toBe(200);
    expect(head.headers.get("cache-control")).toBe("no-store");
    expect(await head.text()).toBe("");
    const options = await dispatchRouteHandler(
      healthcheck,
      new Request("http://127.0.0.1/api/healthcheck", { method: "OPTIONS" })
    );
    expect(options.status).toBe(204);
    expect(options.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
    const post = await dispatchRouteHandler(
      healthcheck,
      new Request("http://127.0.0.1/api/healthcheck", { method: "POST" })
    );
    expect(post.status).toBe(405);
  });

  test("callback paths reject external and encoded protocol-relative redirects", () => {
    for (const value of [
      "https://attacker.invalid",
      "//attacker.invalid",
      "%2F%2Fattacker.invalid",
      "/\\attacker.invalid",
      "%2F%5Cattacker.invalid",
      "javascript%3Aalert(1)",
    ]) {
      expect(sanitizeReturnTo(value)).toBeNull();
      expect(buildPostAuthRedirectPath(value)).toBe("/callback");
    }
    expect(
      sanitizeReturnTo("%2Fmigration-test%2Fintegrations%3Ftab%3Dall")
    ).toBe("/migration-test/integrations?tab=all");
    expect(
      buildPostAuthRedirectPath("/migration-test/integrations?tab=all")
    ).toBe("/callback?returnTo=%2Fmigration-test%2Fintegrations%3Ftab%3Dall");
    expect(
      buildPostAuthRedirectPath("/callback?returnTo=%2Fmigration-test")
    ).toBe("/callback?returnTo=/migration-test");
  });

  test("session CORS never reflects deceptive or credential-bearing origins", () => {
    for (const origin of [
      null,
      "https://attacker.invalid",
      "https://usenotra.com.attacker.invalid",
      "https://usenotra.com@attacker.invalid",
      "http://localhost.attacker.invalid:3000",
    ]) {
      const headers = buildSessionCorsHeaders(origin);
      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
      expect(headers["Access-Control-Allow-Credentials"]).toBeUndefined();
      expect(headers["Cache-Control"]).toBe("no-store");
      expect(headers.Vary).toBe("Origin");
    }
    for (const origin of [
      "https://usenotra.com",
      "https://www.usenotra.com",
      "http://localhost:3000",
    ]) {
      const headers = buildSessionCorsHeaders(origin);
      expect(headers["Access-Control-Allow-Origin"]).toBe(origin);
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    }
  });

  test("machine endpoints remain outside dashboard redirects without exempting similarly named organizations", () => {
    for (const path of [
      "/api/cron/geo-scan",
      "/api/webhooks/workos",
      "/rpc/user/organizations/listOwned",
      "/auth/callback",
      "/login",
      "/robots.txt",
    ]) {
      expect(NON_DASHBOARD_PATH.test(path)).toBe(true);
    }
    for (const path of [
      "/migration-test/integrations",
      "/api-company/content",
      "/rpc-company/settings",
      "/login-company/geo",
    ]) {
      expect(NON_DASHBOARD_PATH.test(path)).toBe(false);
    }
  });

  test("production impersonation stays disabled and mixed forwarded chains fail closed", () => {
    const options = {
      nodeEnv: "development",
      apiKey: "",
      enabledFlag: "true",
      email: "migration-owner@example.invalid",
    };
    const local = new Headers({ host: "127.0.0.1:3000" });
    expect(evaluateLocalDevAuth(local, options)).toEqual({ kind: "allowed" });
    expect(
      evaluateLocalDevAuth(local, { ...options, nodeEnv: "production" })
    ).toEqual({ kind: "disabled" });
    for (const headers of [
      new Headers({
        host: "127.0.0.1:3000",
        "x-forwarded-for": "127.0.0.1, 203.0.113.10",
      }),
      new Headers({ host: "127.0.0.1:3000", "x-real-ip": "203.0.113.10" }),
      new Headers({ host: "127.0.0.1:3000", "cf-ray": "synthetic" }),
    ]) {
      expect(evaluateLocalDevAuth(headers, options)).toEqual({
        kind: "blocked",
        reason: "non_loopback",
      });
    }
  });

  test("locale negotiation preserves weighted German and English fallback", () => {
    expect(negotiateDashboardLocale("de-DE,de;q=0.9,en;q=0.8")).toBe("de");
    expect(negotiateDashboardLocale("de;q=0.2,en-US;q=0.9")).toBe("en");
    expect(negotiateDashboardLocale("de;q=0,en;q=0.5")).toBe("en");
    expect(negotiateDashboardLocale("fr-FR,es;q=0.9")).toBe("en");
    expect(negotiateDashboardLocale("de;q=invalid,en;q=0.8")).toBe("en");
    expect(negotiateDashboardLocale(null)).toBe("en");
  });
});
