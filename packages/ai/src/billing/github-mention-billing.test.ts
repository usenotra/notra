import { beforeEach, describe, expect, mock, test } from "bun:test";

const checkAutumnFeature = mock();
const finalizeAutumnLock = mock();

mock.module("./autumn", () => ({
  autumn: {},
  allowUnmeteredAiInDevelopment: false,
}));
mock.module("./autumn-locks", () => ({
  checkAutumnFeature,
  finalizeAutumnLock,
}));

const {
  confirmGitHubMentionBilling,
  describeGitHubMentionBillingDenial,
  releaseGitHubMentionBilling,
  reserveGitHubMentionBilling,
} = await import("./github-mention-billing");

const reserve = () =>
  reserveGitHubMentionBilling({
    organizationId: "org_1",
    mentionKey: "delivery-1",
  });

const available = (remaining: number) => ({
  response: { allowed: true, balance: { remaining } },
  duplicateLock: false,
});

const empty = (remaining: number | null) => ({
  response: {
    allowed: false,
    ...(remaining === null ? {} : { balance: { remaining } }),
  },
  duplicateLock: false,
});

describe("reserveGitHubMentionBilling", () => {
  beforeEach(() => {
    checkAutumnFeature.mockReset();
    finalizeAutumnLock.mockReset();
  });

  test("spends the plan's pull request credits first", async () => {
    checkAutumnFeature.mockResolvedValueOnce(available(940));

    const reservation = await reserve();

    expect(reservation).toMatchObject({
      allowed: true,
      mode: "pull_request_credits",
      featureId: "pull_request_credits",
      useMarkup: false,
    });
    expect(reservation.lockId).toBe(
      "github-mention-billing:delivery-1:pull_request_credits"
    );
    // The AI credit balance is not even looked at while the plan has room.
    expect(checkAutumnFeature).toHaveBeenCalledTimes(1);
  });

  test("falls back to AI credits once the plan budget is gone", async () => {
    checkAutumnFeature
      .mockResolvedValueOnce(empty(0))
      .mockResolvedValueOnce(available(2500));

    const reservation = await reserve();

    expect(reservation).toMatchObject({
      allowed: true,
      mode: "ai_credits",
      featureId: "ai_credits",
    });
    expect(reservation.lockId).toBe(
      "github-mention-billing:delivery-1:ai_credits"
    );
  });

  test("a redelivery reuses the hold the first attempt took", async () => {
    checkAutumnFeature.mockResolvedValueOnce({
      response: null,
      duplicateLock: true,
    });

    expect(await reserve()).toMatchObject({
      allowed: true,
      mode: "pull_request_credits",
    });
  });

  test("an exhausted plan with no credits left reports the plan", async () => {
    checkAutumnFeature
      .mockResolvedValueOnce(empty(0))
      .mockResolvedValueOnce(empty(0));

    const reservation = await reserve();

    expect(reservation).toMatchObject({
      allowed: false,
      reason: "pull_request_credits_exhausted",
      balanceRemaining: 0,
    });
    expect(describeGitHubMentionBillingDenial(reservation)).toContain(
      "pull request credits"
    );
  });

  test("an organization entitled to neither feature is told so", async () => {
    checkAutumnFeature
      .mockResolvedValueOnce(empty(null))
      .mockResolvedValueOnce(empty(null));

    const reservation = await reserve();

    expect(reservation).toMatchObject({
      allowed: false,
      featureId: null,
      reason: "no_entitlement",
    });
    expect(describeGitHubMentionBillingDenial(reservation)).toContain(
      "no pull request credits"
    );
  });
});

describe("settling a mention", () => {
  beforeEach(() => {
    checkAutumnFeature.mockReset();
    finalizeAutumnLock.mockReset();
  });

  test("charges what the run cost", async () => {
    checkAutumnFeature.mockResolvedValueOnce(available(1000));
    const reservation = await reserve();

    await confirmGitHubMentionBilling({
      reservation,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        modelId: "anthropic/claude-sonnet-4.6",
        totalUsd: 0.42,
      },
    });

    const [lockId, action, value, properties] =
      finalizeAutumnLock.mock.calls[0] ?? [];
    expect(lockId).toBe(
      "github-mention-billing:delivery-1:pull_request_credits"
    );
    expect(action).toBe("confirm");
    expect(value).toBe(42);
    expect(properties).toMatchObject({
      source: "github_mention",
      feature: "pull_request_credits",
      cost_cents: 42,
    });
  });

  test("a run without reported usage still pays the minimum", async () => {
    checkAutumnFeature.mockResolvedValueOnce(available(1000));
    const reservation = await reserve();

    await confirmGitHubMentionBilling({ reservation, usage: null });

    expect(finalizeAutumnLock.mock.calls[0]?.[2]).toBe(1);
  });

  test("a run that never reached the model gives the hold back", async () => {
    checkAutumnFeature.mockResolvedValueOnce(available(1000));
    const reservation = await reserve();

    await releaseGitHubMentionBilling(reservation);

    expect(finalizeAutumnLock.mock.calls[0]?.[1]).toBe("release");
  });

  test("a refused mention has nothing to settle", async () => {
    checkAutumnFeature
      .mockResolvedValueOnce(empty(0))
      .mockResolvedValueOnce(empty(0));
    const reservation = await reserve();

    await confirmGitHubMentionBilling({ reservation, usage: null });
    await releaseGitHubMentionBilling(reservation);

    expect(finalizeAutumnLock).not.toHaveBeenCalled();
  });
});
