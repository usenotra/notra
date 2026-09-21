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

  test("reports what is left and refuses once the window is full", async () => {
    evaluate.mockResolvedValueOnce(7);
    const allowed = await consumeGitHubMentionRateLimit("org_1");
    expect(allowed).toMatchObject({ allowed: true, limit: 20, remaining: 7 });
    expect(allowed.resetAt).toBeGreaterThan(Date.now());
    expect(evaluate.mock.calls[0]?.[1]?.[0]).toStartWith(
      "ratelimit:github-mention:org_1:"
    );

    evaluate.mockResolvedValueOnce(-1);
    expect(await consumeGitHubMentionRateLimit("org_1")).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });
});
