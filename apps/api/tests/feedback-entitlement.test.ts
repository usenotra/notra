import { describe, expect, test } from "bun:test";

import { Effect, Layer } from "effect";
import { Hono } from "hono";

import { FeedbackBillingError } from "../src/errors/billing";
import { BillingService } from "../src/lib/billing";
import { feedbackEntitlementMiddleware } from "../src/middleware/feedback-entitlement";
import { isFeedbackApiRequest } from "../src/utils/feedback";

describe("feedback access", () => {
  test("only feedback paths bypass the subscription gate", () => {
    for (const path of ["/v1/feedback", "/v1/feedback/", "/v1/feedback/item"]) {
      expect(isFeedbackApiRequest(path)).toBe(true);
    }
    for (const path of ["/v1/feedback-other", "/v1/posts", "/v2/feedback"]) {
      expect(isFeedbackApiRequest(path)).toBe(false);
    }
  });

  test.each([
    ["allowed", 200],
    ["denied", 402],
    ["unavailable", 503],
  ] as const)(
    "checks collection and item requests once: %s",
    async (decision, expectedStatus) => {
      let checks = 0;
      let handlers = 0;
      const app = new Hono();
      app.use("*", async (c, next) => {
        c.set("auth", {
          type: "oauth",
          keyId: "key",
          userId: "user",
          scopes: [],
          identity: { externalId: "org-free" },
        });
        await next();
      });
      app.use(
        "/v1/feedback/*",
        feedbackEntitlementMiddleware({
          billingLayer: Layer.succeed(BillingService, {
            checkSubscriptionAccess: () =>
              Effect.die("Must not check a paid plan"),
            checkGeoEntitlement: () => Effect.die("Must not check GEO"),
            checkFeedbackEntitlement: (input) => {
              checks++;
              expect(input.organizationId).toBe("org-free");
              return decision === "unavailable"
                ? Effect.fail(new FeedbackBillingError({ cause: "outage" }))
                : Effect.succeed(decision === "allowed");
            },
          }),
        })
      );
      app.all("*", (c) => {
        handlers++;
        return c.json({ ok: true });
      });

      for (const [method, path] of [
        ["GET", "/v1/feedback"],
        ["POST", "/v1/feedback"],
        ["GET", "/v1/feedback/item"],
        ["PATCH", "/v1/feedback/item"],
      ]) {
        const before = checks;
        const response = await app.request(
          path,
          { method },
          { AUTUMN_SECRET_KEY: "test" }
        );
        expect(response.status).toBe(expectedStatus);
        expect(checks - before).toBe(1);
      }
      expect(handlers).toBe(decision === "allowed" ? 4 : 0);

      const publicResponse = await app.request(
        "/v1/feedback/public-slug",
        { method: "POST" },
        {}
      );
      expect(publicResponse.status).toBe(200);
      expect(checks).toBe(4);
    }
  );
});
