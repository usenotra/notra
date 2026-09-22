import { beforeEach, describe, expect, mock, test } from "bun:test";

const checkAutumnFeature = mock();
const getOrCreate = mock();

mock.module("./autumn", () => ({
  autumn: { customers: { getOrCreate } },
  allowUnmeteredAiInDevelopment: false,
}));
mock.module("./autumn-locks", () => ({
  checkAutumnFeature,
  finalizeAutumnLock: mock(),
}));

const { reserveContentBilling } = await import("./content-billing");

const noFeature = {
  response: { allowed: false },
  duplicateLock: false,
};
const emptyCredits = {
  response: { allowed: false, balance: { remaining: 0 } },
  duplicateLock: false,
};
const starter = {
  subscriptions: [{ addOn: false, status: "active", planId: "starter" }],
};

const productAi = {
  organizationId: "org_1",
  outputType: null,
  executionId: "run-1",
  allowPlanIncluded: true,
} as const;

describe("reserveContentBilling plan inclusion", () => {
  beforeEach(() => {
    checkAutumnFeature.mockReset();
    getOrCreate.mockReset();
  });

  test("charges credits when a balance is available", async () => {
    checkAutumnFeature.mockResolvedValueOnce({
      response: { allowed: true, balance: { remaining: 100 } },
      duplicateLock: false,
    });
    expect(await reserveContentBilling(productAi)).toMatchObject({
      allowed: true,
      mode: "ai_credits",
      reserved: true,
    });
    expect(getOrCreate).not.toHaveBeenCalled();
  });

  test("includes an opted-in run on an active paid plan when credits are missing or empty", async () => {
    for (const credits of [noFeature, emptyCredits]) {
      checkAutumnFeature.mockReset();
      getOrCreate.mockReset();
      checkAutumnFeature.mockResolvedValueOnce(credits);
      getOrCreate.mockResolvedValueOnce(starter);
      expect(await reserveContentBilling(productAi)).toMatchObject({
        allowed: true,
        mode: "plan_included",
        reserved: false,
        lockId: null,
      });
    }
  });

  test("does not include a run that did not opt in", async () => {
    checkAutumnFeature.mockResolvedValueOnce(noFeature);
    expect(
      await reserveContentBilling({ ...productAi, allowPlanIncluded: false })
    ).toMatchObject({
      allowed: false,
      reason: "no_entitlement",
    });
    expect(getOrCreate).not.toHaveBeenCalled();
  });

  test("keeps a content quota off the included path", async () => {
    checkAutumnFeature
      .mockResolvedValueOnce(noFeature)
      .mockResolvedValueOnce(noFeature);
    getOrCreate.mockResolvedValue(starter);
    expect(
      await reserveContentBilling({
        organizationId: "org_1",
        outputType: "blog_post",
        executionId: "run-1",
        allowPlanIncluded: true,
      })
    ).toMatchObject({
      allowed: false,
      reason: "no_entitlement",
      featureId: "long_form_posts",
    });
    expect(getOrCreate).not.toHaveBeenCalled();
  });
});
