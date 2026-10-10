import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getOperationalContext,
  runWithOperationalContext,
} from "@notra/ai/utils/operational-context";
import { Hono } from "hono";

import { apiAuthTelemetryMiddleware } from "../src/middleware/observability";
import { type AuthData, isOAuthAuth } from "../src/types/auth";
import { apiRequestLogFields } from "../src/utils/analytics";

test("only verified OAuth identities propagate to nested calls and request events", async () => {
  const identities: AuthData[] = [
    {
      type: "oauth",
      keyId: "oauth_fixture",
      scopes: ["content.read"],
      userId: "user_verified",
      identity: { externalId: "org_verified" },
    },
    {
      valid: true,
      code: "VALID",
      identity: { id: "identity_fixture", externalId: "org_verified" },
    },
  ];
  for (const auth of identities) {
    const app = new Hono<{ Variables: { auth: AuthData } }>();
    // This fixture stands in for the already-tested credential verifier.
    app.use("*", async (c, next) => {
      c.set("auth", auth);
      await next();
    });
    app.use("*", apiAuthTelemetryMiddleware);
    app.get("/v1/posts", (c) => {
      const expectedUser = isOAuthAuth(auth) ? auth.userId : undefined;
      assert.equal(getOperationalContext()?.organizationId, "org_verified");
      assert.equal(getOperationalContext()?.userId, expectedUser);
      c.res = c.json({ ok: true });
      const fields = apiRequestLogFields(c, 0);
      assert.equal(fields.userId, expectedUser);
      assert.equal(fields.organizationId, "org_verified");
      assert.equal(fields.routeId, "/v1/posts");
      return c.res;
    });
    await runWithOperationalContext({ requestId: "req_verified" }, async () => {
      const response = await app.request("https://fixture.invalid/v1/posts");
      assert.equal(response.status, 200);
      assert.equal(getOperationalContext()?.userId, undefined);
      assert.equal(getOperationalContext()?.organizationId, undefined);
    });
  }
});

test("rejected API credentials cannot attribute user or tenant from headers or input", async () => {
  const app = new Hono();
  app.use("*", async (c, next) => {
    await next();
    const fields = apiRequestLogFields(c, 0);
    assert.equal(fields.userId, undefined);
    assert.equal(fields.organizationId, null);
    assert.equal(getOperationalContext()?.userId, undefined);
    assert.equal(getOperationalContext()?.organizationId, undefined);
  });
  app.use("*", (c) => c.json({ error: "Denied fixture" }, 403));
  app.use("*", apiAuthTelemetryMiddleware);
  app.get("/v1/posts", () => {
    throw new Error("Rejected credentials must not reach the handler");
  });
  await runWithOperationalContext({ requestId: "req_fixture" }, async () => {
    const response = await app.request(
      "https://fixture.invalid/v1/posts?organizationId=org_unverified",
      {
        headers: {
          "x-user-id": "user_unverified",
          "x-organization-id": "org_unverified",
        },
      }
    );
    assert.equal(response.status, 403);
  });
});
