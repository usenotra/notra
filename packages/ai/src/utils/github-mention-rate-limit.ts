import { GITHUB_MENTION_RATE_LIMIT } from "@notra/ai/constants/rate-limits";
import type { GitHubMentionRateLimit } from "@notra/ai/types/github-mention";
import { redis } from "@notra/ai/utils/redis";

const KEY_PREFIX = "ratelimit:github-mention";

/**
 * The previous window still counts, weighted by how much of the current one is
 * left, so the limit cannot be doubled by mentioning either side of a window
 * boundary. Reading and incrementing in one script keeps concurrent
 * deliveries from both seeing the same free slot.
 */
const SLIDING_WINDOW_SCRIPT = `
local current = KEYS[1]
local previous = KEYS[2]
local limit = tonumber(ARGV[1])
local elapsed = tonumber(ARGV[2])
local window = tonumber(ARGV[3])

local used = tonumber(redis.call("GET", current) or "0")
  + math.floor((1 - elapsed) * tonumber(redis.call("GET", previous) or "0"))

if used >= limit then
  return -1
end

local value = redis.call("INCR", current)
if value == 1 then
  redis.call("PEXPIRE", current, window * 2 + 1000)
end

return limit - used - 1
`;

/**
 * Counts this mention against the organization's window. Without Redis nothing
 * is counted: a missing limiter must not stop the bot from answering. It does
 * count in development, so the limit can be seen working before it ships.
 */
export async function consumeGitHubMentionRateLimit(
  organizationId: string
): Promise<GitHubMentionRateLimit> {
  const { requests, windowMs } = GITHUB_MENTION_RATE_LIMIT;
  const now = Date.now();
  const window = Math.floor(now / windowMs);
  const resetAt = (window + 1) * windowMs;

  if (!redis) {
    return { allowed: true, limit: requests, remaining: requests, resetAt };
  }

  const remaining = await redis.eval<[number, number, number], number>(
    SLIDING_WINDOW_SCRIPT,
    [
      `${KEY_PREFIX}:${organizationId}:${window}`,
      `${KEY_PREFIX}:${organizationId}:${window - 1}`,
    ],
    [requests, (now % windowMs) / windowMs, windowMs]
  );

  return {
    allowed: remaining >= 0,
    limit: requests,
    remaining: Math.max(0, remaining),
    resetAt,
  };
}
