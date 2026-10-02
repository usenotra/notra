import { afterEach, describe, expect, test } from "bun:test";

import { Hono } from "hono";

import { authMiddleware } from "../src/middleware/auth";
import { unkeyPermissions } from "../src/utils/unkey-permissions";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("Unkey scope verification", () => {
  test("groups expressions, deduplicates fallbacks, and omits empty permissions", () => {
    expect(unkeyPermissions()).toBeUndefined();
    expect(unkeyPermissions("posts.read", ["posts.read", ""])).toBe(
      "posts.read"
    );
    expect(
      unkeyPermissions("posts.read AND projects.read", [
        "api.read",
        "api.write",
      ])
    ).toBe("(posts.read AND projects.read) OR (api.read) OR (api.write)");
    expect(unkeyPermissions("posts.write", ["api.write"])).toBe(
      "(posts.write) OR (api.write)"
    );
  });

  test("performs one SDK verification per request, including denied requests", async () => {
    const requests: unknown[] = [];
    let valid = true;
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      expect(new URL(request.url).hostname).toBe("api.unkey.com");
      requests.push(await request.json());
      return Response.json({
        meta: { requestId: "test" },
        data: {
          valid,
          code: valid ? "VALID" : "INSUFFICIENT_PERMISSIONS",
          keyId: "key-test",
          identity: { id: "identity-test", externalId: "org-test" },
        },
      });
    };
    const app = new Hono();
    app.get(
      "/",
      authMiddleware({
        permissions: "projects.read",
        legacyPermissions: ["api.read", "api.write"],
      }),
      (c) => c.json({ ok: true })
    );
    const request = () =>
      app.request(
        "/",
        { headers: { authorization: "Bearer test-key" } },
        { UNKEY_ROOT_KEY: "test-root" }
      );
    expect((await request()).status).toBe(200);
    valid = false;
    expect((await request()).status).toBe(403);
    expect(requests).toEqual(
      Array.from({ length: 2 }, () => ({
        key: "test-key",
        permissions: "(projects.read) OR (api.read) OR (api.write)",
      }))
    );
  });
});
