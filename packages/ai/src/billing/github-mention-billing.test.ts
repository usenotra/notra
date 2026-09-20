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
const empty = { response: { allowed: false, balance: { remaining: 0 } } };
const lock = (feature: string) =>
  `github-mention-billing:delivery-1:${feature}`;

describe("reserveGitHubMentionBilling", () => {
  beforeEach(() => {
    checkAutumnFeature.mockReset();
    finalizeAutumnLock.mockReset();
  });

  test("spends plan credits first and only then AI credits", async () => {
    checkAutumnFeature.mockResolvedValueOnce(available(940));
    expect(await reserve()).toMatchObject({
      allowed: true,
      mode: "pull_request_credits",
      lockId: lock("pull_request_credits"),
    });
    // The AI credit balance is not even looked at while the plan has room.
    expect(checkAutumnFeature).toHaveBeenCalledTimes(1);

    checkAutumnFeature.mockReset();
    checkAutumnFeature
      .mockResolvedValueOnce(empty)
      .mockResolvedValueOnce(available(2500));
    expect(await reserve()).toMatchObject({
      allowed: true,
      mode: "ai_credits",
      lockId: lock("ai_credits"),
    });
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

  test("an empty balance refuses the run and holds nothing", async () => {
    checkAutumnFeature
      .mockResolvedValueOnce(empty)
      .mockResolvedValueOnce(empty);
    const reservation = await reserve();
    expect(reservation).toMatchObject({
      allowed: false,
      reason: "pull_request_credits_exhausted",
      lockId: null,
    });

    await confirmGitHubMentionBilling({ reservation, usage: null });
    await releaseGitHubMentionBilling(reservation);
    expect(finalizeAutumnLock).not.toHaveBeenCalled();
  });

  test("settles the hold with what the run cost", async () => {
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
    expect(finalizeAutumnLock.mock.calls[0]?.slice(0, 3)).toEqual([
      lock("pull_request_credits"),
      "confirm",
      42,
    ]);

    finalizeAutumnLock.mockReset();
    await releaseGitHubMentionBilling(reservation);
    expect(finalizeAutumnLock.mock.calls[0]?.[1]).toBe("release");
  });
});
