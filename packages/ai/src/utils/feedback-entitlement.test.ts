import { describe, expect, spyOn, test } from "bun:test";

import { Autumn, HTTPClient } from "autumn-js";

import { hasFeedbackEntitlement } from "./feedback-entitlement";

describe("feedback entitlement", () => {
  test.each([true, false])(
    "returns a verified decision: %s",
    async (allowed) => {
      let calls = 0;
      const autumn = new Autumn({
        secretKey: "test",
        failOpen: false,
        httpClient: new HTTPClient({
          fetcher: async (input, init) => {
            calls++;
            const request = new Request(input, init);
            expect(await new Response(request.body).json()).toMatchObject({
              customer_id: "org-free",
              feature_id: "feedback",
            });
            return Response.json({
              allowed,
              customer_id: "org-free",
              balance: null,
              flag: allowed
                ? {
                    id: "flag-feedback",
                    feature_id: "feedback",
                    plan_id: "free",
                    expires_at: null,
                  }
                : null,
            });
          },
        }),
      });
      expect(await hasFeedbackEntitlement(autumn, "org-free")).toBe(allowed);
      expect(calls).toBe(1);
    }
  );

  test.each([500, 202])(
    "rejects an outage response: HTTP %s",
    async (status) => {
      using fetchMock = spyOn(globalThis, "fetch").mockImplementation(
        async () =>
          Response.json(
            { allowed: true, customer_id: "", balance: null, flag: null },
            { status }
          )
      );
      const autumn = new Autumn({
        secretKey: "test",
        retryConfig: { strategy: "none" },
      });
      await expect(hasFeedbackEntitlement(autumn, "org-free")).rejects.toThrow(
        "Feedback entitlement could not be verified"
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  );

  test.each(["network", "timeout"])("rejects %s failures", async (kind) => {
    using fetchMock = spyOn(globalThis, "fetch").mockRejectedValue(
      kind === "timeout"
        ? new DOMException("Timed out", "TimeoutError")
        : new TypeError("Failed to fetch")
    );
    const autumn = new Autumn({
      secretKey: "test",
      retryConfig: { strategy: "none" },
    });
    await expect(hasFeedbackEntitlement(autumn, "org-free")).rejects.toThrow(
      "Feedback entitlement could not be verified"
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("rejects an allowed response without the feedback flag", async () => {
    const autumn = new Autumn({
      secretKey: "test",
      failOpen: false,
      httpClient: new HTTPClient({
        fetcher: async () =>
          Response.json({
            allowed: true,
            customer_id: "org-free",
            balance: null,
            flag: null,
          }),
      }),
    });
    await expect(hasFeedbackEntitlement(autumn, "org-free")).rejects.toThrow(
      "Feedback entitlement could not be verified"
    );
  });
});
