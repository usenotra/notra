import { describe, expect, test } from "bun:test";

import { requestHandler } from "@tanstack/react-start/server";

import { demoProxy } from "./demo-proxy";

const handleRequest = requestHandler(
  (request) => demoProxy(request) ?? new Response("downstream")
);

describe("demo redirects behind an HTTPS reverse proxy", () => {
  test.each([
    ["/", "/api/demo/enter"],
    [
      "/?banner=off&theme=dark",
      "/api/demo/enter?returnTo=%2F%3Fbanner%3Doff%26theme%3Ddark",
    ],
    [
      "/demo-workspace/content?view=grid",
      "/api/demo/enter?returnTo=%2Fdemo-workspace%2Fcontent%3Fview%3Dgrid",
    ],
    ["/login", "/api/demo/enter"],
    [
      "/login?returnTo=%2Fdemo-workspace%2Fgeo%3Fproject%3Dsample",
      "/api/demo/enter?returnTo=%2Fdemo-workspace%2Fgeo%3Fproject%3Dsample",
    ],
    ["/auth/callback?returnTo=%2F", "/api/demo/enter"],
    ["/demo-workspace/geo/directions", "/demo-workspace/geo"],
    ["/onboarding/profile", "/"],
  ])("keeps %s on the browser's HTTPS origin", async (path, destination) => {
    const response = await handleRequest(
      new Request(`http://127.0.0.1:8080${path}`, {
        headers: {
          "x-forwarded-host": "demo.usenotra.com",
          "x-forwarded-proto": "https",
        },
      }),
      undefined
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(destination);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    const target = new URL(
      response.headers.get("Location") ?? "",
      "https://demo.usenotra.com"
    );
    expect(target.protocol).toBe("https:");
    expect(target.host).toBe("demo.usenotra.com");
  });

  test("preserves the banner cookie on the entry redirect", async () => {
    const response = await handleRequest(
      new Request("http://127.0.0.1:8080/?banner=off"),
      undefined
    );
    expect(response.headers.get("Location")).toBe(
      "/api/demo/enter?returnTo=%2F%3Fbanner%3Doff"
    );
    expect(response.headers.getSetCookie()).toEqual([
      expect.stringContaining("notra_demo_banner=off;"),
    ]);
  });

  test("keeps signup on the configured external HTTPS destination", async () => {
    const response = await handleRequest(
      new Request("http://127.0.0.1:8080/signup"),
      undefined
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      "https://app.usenotra.com/signup"
    );
  });

  test.each(["/auth/demo", "/api/demo/sandbox/info", "/demo-workspace/geo"])(
    "leaves %s accessible with a demo session",
    async (path) => {
      const response = await handleRequest(
        new Request(`http://127.0.0.1:8080${path}`, {
          headers: { cookie: "notra_demo=anon_local_fixture" },
        }),
        undefined
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("downstream");
    }
  );

  test("keeps external account connections blocked", async () => {
    const response = await handleRequest(
      new Request("http://127.0.0.1:8080/api/integrations/linear/authorize"),
      undefined
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
});
