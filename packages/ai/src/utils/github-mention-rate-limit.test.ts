import { beforeEach, describe, expect, mock, test } from "bun:test";

const evaluate = mock();

mock.module("@notra/ai/utils/redis", () => ({
  redis: { eval: evaluate },
}));

const { consumeGitHubMentionRateLimit } =
  await import("./github-mention-rate-limit");

describe("consumeGitHubMentionRateLimit", () => {
  beforeEach(() => {
    evaluate.mockReset();
  });

  test("reports what is left in the window", async () => {
    evaluate.mockResolvedValueOnce(7);

    const result = await consumeGitHubMentionRateLimit("org_1");

    expect(result).toMatchObject({ allowed: true, limit: 20, remaining: 7 });
    expect(result.resetAt).toBeGreaterThan(Date.now());
    const [, keys] = evaluate.mock.calls[0] ?? [];
    expect(keys).toHaveLength(2);
    expect(keys[0]).toStartWith("ratelimit:github-mention:org_1:");
  });

  test("refuses once the window is full", async () => {
    evaluate.mockResolvedValueOnce(-1);

    expect(await consumeGitHubMentionRateLimit("org_1")).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });
});
