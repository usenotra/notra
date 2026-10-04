import { describe, expect, test } from "bun:test";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { os, type RouterClient } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import { NON_DASHBOARD_PATH } from "../src/constants/auth-routes";
import {
  buildPostAuthRedirectPath,
  sanitizeReturnTo,
} from "../src/lib/auth/return-to";
import { buildSessionCorsHeaders } from "../src/lib/auth/session-cors";
import { createDashboardHandlerPlugins } from "../src/lib/orpc/handler-plugins";
import { createDashboardLinkPlugins } from "../src/lib/orpc/link-plugins";
import { evaluateLocalDevAuth } from "../src/utils/local-dev-auth";

describe("migration executable security contracts", () => {
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

  test("rpc procedures only run for requests carrying the dashboard client's CSRF header", async () => {
    let calls = 0;
    const router = {
      mutate: os.handler(() => {
        calls += 1;
        return "ok";
      }),
    };
    const handler = new RPCHandler(router, {
      plugins: createDashboardHandlerPlugins(),
    });
    const handle = async (request: Request) =>
      (await handler.handle(request, { prefix: "/rpc", context: {} }))
        .response ?? new Response("Not Found", { status: 404 });

    const forged = await handle(
      new Request("https://app.invalid/rpc/mutate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    );
    expect(forged.status).toBe(403);
    const forgedBatch = await handle(
      new Request("https://app.invalid/rpc/__batch__", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-orpc-batch": "buffered",
        },
        body: JSON.stringify([
          { url: "https://app.invalid/rpc/mutate", method: "POST", body: {} },
        ]),
      })
    );
    expect(await forgedBatch.text()).not.toContain('"ok"');
    expect(calls).toBe(0);

    const client: RouterClient<typeof router> = createORPCClient(
      new RPCLink({
        url: "https://app.invalid/rpc",
        plugins: createDashboardLinkPlugins(),
        fetch: (request) => handle(request),
      })
    );
    expect(await Promise.all([client.mutate(), client.mutate()])).toEqual([
      "ok",
      "ok",
    ]);
    expect(calls).toBe(2);
  });

  test("cookie-writing rpc procedures never share a streamed batch", async () => {
    const procedure = os.$context<{ resHeaders: Headers }>();
    const router = {
      organization: { list: procedure.handler(() => "orgs") },
      user: {
        security: {
          startTotpEnrollment: procedure.handler(async ({ context }) => {
            await new Promise((resolve) => setTimeout(resolve, 20));
            context.resHeaders.append("set-cookie", "enrollment=1");
            return "enrolled";
          }),
        },
      },
    };
    const handler = new RPCHandler(router, {
      plugins: createDashboardHandlerPlugins<{ resHeaders: Headers }>(),
    });
    const cookies: string[] = [];
    const client: RouterClient<typeof router> = createORPCClient(
      new RPCLink({
        url: "https://app.invalid/rpc",
        plugins: createDashboardLinkPlugins(),
        fetch: async (request) => {
          const resHeaders = new Headers();
          const { response } = await handler.handle(request, {
            prefix: "/rpc",
            context: { resHeaders },
          });
          cookies.push(...resHeaders.getSetCookie());
          return response ?? new Response("Not Found", { status: 404 });
        },
      })
    );

    expect(
      await Promise.all([
        client.organization.list(),
        client.user.security.startTotpEnrollment(),
      ])
    ).toEqual(["orgs", "enrolled"]);
    expect(cookies).toEqual(["enrollment=1"]);
  });
});
