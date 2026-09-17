import { beforeEach, describe, expect, mock, test } from "bun:test";

import { NextRequest } from "next/server";

mock.module("server-only", () => ({}));
const { handleAuthkitProxy } = await import("@workos-inc/authkit-nextjs");

let authenticated = false;
const readSession = mock(async () => ({
  session: { user: authenticated ? { id: "user_fixture" } : null },
  headers: new Headers({
    "x-workos-middleware": "true",
    ...(authenticated ? { "x-workos-session": "verified-session" } : {}),
    "set-cookie": "wos-session=refreshed; HttpOnly; Path=/",
  }),
}));

mock.module("@workos-inc/authkit-nextjs", () => ({
  authkit: readSession,
  handleAuthkitProxy,
}));

const { default: proxy } = await import("../src/proxy");

beforeEach(() => {
  authenticated = false;
  readSession.mockClear();
});

describe("dashboard proxy authentication", () => {
  test.each(["/acme", "/acme/geo/prompts?project=one", "/login-team/geo"])(
    "redirects logged-out requests before rendering %s",
    async (path) => {
      const response = await proxy(
        new NextRequest(`https://app.example${path}`)
      );
      const destination = new URL(response.headers.get("location") ?? "");
      expect(destination.pathname).toBe("/login");
      expect(destination.searchParams.get("returnTo")).toBe(path);
      expect(response.status).toBe(307);
      expect(readSession).toHaveBeenCalledTimes(1);
    }
  );

  test.each([
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
    "/auth/social/callback",
    "/auth/banned",
    "/callback",
    "/api/session",
    "/rpc/geo/overview",
    "/onboarding",
    "/connect/linkedin",
    "/integrations/github",
    "/design-system",
    "/brands/hermes.png",
    "/testimonials/will.webp",
    "/web-app-manifest-192x192.png",
  ])("leaves independent routes accessible: %s", async (path) => {
    const response = await proxy(new NextRequest(`https://app.example${path}`));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("forwards verified session headers and refreshed cookies", async () => {
    authenticated = true;
    const response = await proxy(
      new NextRequest("https://app.example/acme/geo")
    );
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-request-x-workos-session")).toBe(
      "verified-session"
    );
    expect(response.headers.get("x-workos-session")).toBeNull();
    expect(response.headers.get("set-cookie")).toContain(
      "wos-session=refreshed"
    );
  });

  test("ignores forged session headers", async () => {
    const response = await proxy(
      new NextRequest("https://app.example/acme", {
        headers: { "x-workos-session": "forged-session" },
      })
    );
    expect(response.status).toBe(307);
  });

  test("redirects unauthenticated actions without replaying the POST", async () => {
    const response = await proxy(
      new NextRequest("https://app.example/acme", {
        method: "POST",
      })
    );
    expect(response.status).toBe(303);
  });
});
