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
  createGitHubMentionUsageCollector,
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

test("collects outer steps and nested sandbox spend once", () => {
  const usage = createGitHubMentionUsageCollector();
  usage.add({
    inputTokens: 10,
    outputTokens: 2,
    totalTokens: 12,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    modelId: "model",
    maxPromptTokens: 10,
    tokenCostUsd: 0.01,
    computeMs: 10,
  });
  usage.add({
    inputTokens: 20,
    outputTokens: 3,
    totalTokens: 23,
    cacheReadTokens: 1,
    cacheWriteTokens: 0,
    modelId: "model",
    maxPromptTokens: 21,
    tokenCostUsd: 0.02,
    computeMs: 20,
  });
  // The sandbox reports its Box stream cost through the same callback.
  usage.add({
    inputTokens: 30,
    outputTokens: 4,
    totalTokens: 34,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    modelId: "model",
    totalUsd: 0.04,
    computeMs: 30,
  });

  expect(usage.get()).toMatchObject({
    inputTokens: 60,
    outputTokens: 9,
    totalTokens: 69,
    cacheReadTokens: 1,
    maxPromptTokens: 21,
    tokenCostUsd: 0.07,
    totalUsd: 0.07,
    computeMs: 60,
  });
});

test("an unknown step cost is not silently counted as zero", () => {
  const usage = createGitHubMentionUsageCollector();
  usage.add({
    inputTokens: 10,
    outputTokens: 2,
    totalTokens: 12,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    tokenCostUsd: 0.01,
  });
  usage.add({
    inputTokens: 20,
    outputTokens: 3,
    totalTokens: 23,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  });
  expect(usage.get()?.tokenCostUsd).toBeUndefined();
});

test("a collector distinguishes no model work from partial paid work", () => {
  const usage = createGitHubMentionUsageCollector();
  expect(usage.get()).toBeNull();
  usage.add({
    inputTokens: 1,
    outputTokens: 1,
    totalTokens: 2,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  });
  expect(usage.get()?.totalTokens).toBe(2);
});
