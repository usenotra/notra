import { describe, expect, test } from "bun:test";

import { Effect, Layer } from "effect";

import {
  GeoBillingError,
  SubscriptionBillingError,
} from "../src/errors/billing";
import { BillingService, type BillingOperations } from "../src/lib/billing";
import { checkGeoEntitlement } from "../src/programs/geo-entitlement";
import { checkSubscriptionAccess } from "../src/programs/subscription";

const input = {
  organizationId: "org_test",
  secretKey: "secret_test",
};

function fakeBillingLayer(
  impl: Partial<{
    checkSubscriptionAccess: BillingOperations["checkSubscriptionAccess"];
    checkGeoEntitlement: BillingOperations["checkGeoEntitlement"];
  }>
) {
  return Layer.succeed(
    BillingService,
    BillingService.of({
      checkSubscriptionAccess:
        impl.checkSubscriptionAccess ?? (() => Effect.succeed(true)),
      checkGeoEntitlement:
        impl.checkGeoEntitlement ?? (() => Effect.succeed(true)),
    })
  );
}

describe("BillingService", () => {
  test("subscription access succeeds when billing grants access", async () => {
    const result = await Effect.runPromise(
      Effect.result(checkSubscriptionAccess(input)).pipe(
        Effect.provide(
          fakeBillingLayer({
            checkSubscriptionAccess: () => Effect.succeed(true),
          })
        )
      )
    );

    expect(result).toMatchObject({ success: true });
  });

  test("subscription access returns false for paywall paths", async () => {
    const result = await Effect.runPromise(
      Effect.result(checkSubscriptionAccess(input)).pipe(
        Effect.provide(
          fakeBillingLayer({
            checkSubscriptionAccess: () => Effect.succeed(false),
          })
        )
      )
    );

    expect(result).toMatchObject({ success: false });
  });

  test("subscription billing errors surface as typed failures", async () => {
    const cause = new Error("autumn unavailable");
    const result = await Effect.runPromise(
      Effect.result(checkSubscriptionAccess(input)).pipe(
        Effect.provide(
          fakeBillingLayer({
            checkSubscriptionAccess: () =>
              Effect.fail(new SubscriptionBillingError({ cause })),
          })
        )
      )
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure).toBeInstanceOf(SubscriptionBillingError);
      expect(result.failure.cause).toBe(cause);
    }
  });

  test("geo entitlement succeeds when billing grants access", async () => {
    const result = await Effect.runPromise(
      Effect.result(checkGeoEntitlement(input)).pipe(
        Effect.provide(
          fakeBillingLayer({
            checkGeoEntitlement: () => Effect.succeed(true),
          })
        )
      )
    );

    expect(result).toMatchObject({ success: true });
  });

  test("geo entitlement returns false for paywall paths", async () => {
    const result = await Effect.runPromise(
      Effect.result(checkGeoEntitlement(input)).pipe(
        Effect.provide(
          fakeBillingLayer({
            checkGeoEntitlement: () => Effect.succeed(false),
          })
        )
      )
    );

    expect(result).toMatchObject({ success: false });
  });

  test("geo billing errors surface as typed failures", async () => {
    const cause = new Error("autumn unavailable");
    const result = await Effect.runPromise(
      Effect.result(checkGeoEntitlement(input)).pipe(
        Effect.provide(
          fakeBillingLayer({
            checkGeoEntitlement: () =>
              Effect.fail(new GeoBillingError({ cause })),
          })
        )
      )
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure).toBeInstanceOf(GeoBillingError);
      expect(result.failure.cause).toBe(cause);
    }
  });
});
