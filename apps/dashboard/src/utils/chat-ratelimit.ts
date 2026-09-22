import {
  CHAT_GENERATION_RATE_LIMIT,
  CHAT_GENERATION_USER_RATE_LIMIT,
} from "@notra/ai/constants/rate-limits";
import { type Algorithm, Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const ORGANIZATION_PREFIX = "ratelimit:chat-generation";
const USER_PREFIX = "ratelimit:dashboard-chat-generation-user";
const DUAL_LIMIT_PREFIX = "ratelimit:dashboard-chat-generation-dual";
const WINDOW_MS = 60_000;

const DUAL_SLIDING_WINDOW_SCRIPT = `
local orgCurrent = KEYS[1]
local orgPrevious = KEYS[2]
local userCurrent = KEYS[3]
local userPrevious = KEYS[4]
local orgLimit = tonumber(ARGV[1])
local userLimit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local window = tonumber(ARGV[4])
local consume = tonumber(ARGV[5])

local function weightedUsage(currentKey, previousKey)
  local current = tonumber(redis.call("GET", currentKey) or "0")
  local previous = tonumber(redis.call("GET", previousKey) or "0")
  local percentageInCurrent = (now % window) / window
  return current + math.floor((1 - percentageInCurrent) * previous)
end

local orgUsed = weightedUsage(orgCurrent, orgPrevious)
local userUsed = weightedUsage(userCurrent, userPrevious)

if orgUsed >= orgLimit then
  return {-1, orgLimit}
end
if userUsed >= userLimit then
  return {-1, userLimit}
end

if consume == 1 then
  local orgValue = redis.call("INCR", orgCurrent)
  local userValue = redis.call("INCR", userCurrent)
  if orgValue == 1 then redis.call("PEXPIRE", orgCurrent, window * 2 + 1000) end
  if userValue == 1 then redis.call("PEXPIRE", userCurrent, window * 2 + 1000) end
  orgUsed = orgUsed + 1
  userUsed = userUsed + 1
end

local orgRemaining = orgLimit - orgUsed
local userRemaining = userLimit - userUsed
if orgRemaining <= userRemaining then
  return {orgRemaining, orgLimit}
end
return {userRemaining, userLimit}
`;

interface ChatRatelimitContext {
  redis: Redis;
  prefix: string;
}

function getDualLimitKeys(identifier: string, now: number) {
  const encodedIds = identifier.slice(`${DUAL_LIMIT_PREFIX}:`.length);
  const [organizationId, userId] = JSON.parse(encodedIds) as [string, string];
  const currentWindow = Math.floor(now / WINDOW_MS);

  return [
    `${ORGANIZATION_PREFIX}:${organizationId}:${currentWindow}`,
    `${ORGANIZATION_PREFIX}:${organizationId}:${currentWindow - 1}`,
    `${USER_PREFIX}:${organizationId}:${userId}:${currentWindow}`,
    `${USER_PREFIX}:${organizationId}:${userId}:${currentWindow - 1}`,
  ];
}

function dualChatGenerationLimiter(): Algorithm<ChatRatelimitContext> {
  return () => ({
    async limit(context, identifier) {
      const now = Date.now();
      const [remaining, limit] = await context.redis.eval<
        [number, number, number, number, number],
        [number, number]
      >(DUAL_SLIDING_WINDOW_SCRIPT, getDualLimitKeys(identifier, now), [
        CHAT_GENERATION_RATE_LIMIT.requests,
        CHAT_GENERATION_USER_RATE_LIMIT.requests,
        now,
        WINDOW_MS,
        1,
      ]);

      return {
        success: remaining >= 0,
        limit,
        remaining: Math.max(0, remaining),
        reset: (Math.floor(now / WINDOW_MS) + 1) * WINDOW_MS,
        pending: Promise.resolve(),
      };
    },
    async getRemaining(context, identifier) {
      const now = Date.now();
      const [remaining, limit] = await context.redis.eval<
        [number, number, number, number, number],
        [number, number]
      >(DUAL_SLIDING_WINDOW_SCRIPT, getDualLimitKeys(identifier, now), [
        CHAT_GENERATION_RATE_LIMIT.requests,
        CHAT_GENERATION_USER_RATE_LIMIT.requests,
        now,
        WINDOW_MS,
        0,
      ]);

      return {
        limit,
        remaining: Math.max(0, remaining),
        reset: (Math.floor(now / WINDOW_MS) + 1) * WINDOW_MS,
      };
    },
    async resetTokens(context, identifier) {
      await context.redis.del(...getDualLimitKeys(identifier, Date.now()));
    },
  });
}

const chatGenerationRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  prefix: DUAL_LIMIT_PREFIX,
  limiter: dualChatGenerationLimiter(),
});

function rateLimitedResponse(result: {
  limit: number;
  remaining: number;
  reset: number;
}) {
  const resetSeconds = Math.max(
    0,
    Math.ceil((result.reset - Date.now()) / 1000)
  );

  return NextResponse.json(
    {
      error: "Rate limit exceeded",
      limit: result.limit,
      remaining: Math.max(0, result.remaining),
      reset: result.reset,
    },
    {
      status: 429,
      headers: {
        "RateLimit-Limit": String(result.limit),
        "RateLimit-Remaining": String(Math.max(0, result.remaining)),
        "RateLimit-Reset": String(resetSeconds),
        "Retry-After": String(resetSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
        "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
      },
    }
  );
}

export async function enforceChatGenerationRatelimit(
  organizationId: string,
  userId: string
): Promise<NextResponse | null> {
  const result = await chatGenerationRatelimit.limit(
    JSON.stringify([organizationId, userId])
  );
  if (!result.success) {
    return rateLimitedResponse(result);
  }

  return null;
}
