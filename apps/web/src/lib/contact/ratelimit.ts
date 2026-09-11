import { createHash } from "node:crypto";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Data, Effect } from "effect";
import type { NextRequest } from "next/server";

import { CONTACT_RATE_LIMITS } from "@/constants/contact";

type LimiterKind = keyof typeof CONTACT_RATE_LIMITS;

interface RateLimitResult {
  readonly limit: number;
  readonly remaining: number;
  readonly reset: number;
}

class ContactMessageRateLimitExceeded extends Data.TaggedError(
  "ContactMessageRateLimitExceeded"
)<{
  readonly limit: number;
  readonly remaining: number;
  readonly reset: number;
}> {}

class ContactMessageRateLimitError extends Data.TaggedError(
  "ContactMessageRateLimitError"
)<{
  readonly message: string;
  readonly cause: unknown;
}> {}

const limiters: Partial<Record<LimiterKind, Ratelimit | null>> = {};

function getLimiter(kind: LimiterKind): Ratelimit | null {
  if (limiters[kind] !== undefined) {
    return limiters[kind] ?? null;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!(url && token)) {
    limiters[kind] = null;
    return null;
  }

  const config = CONTACT_RATE_LIMITS[kind];
  const prefix =
    kind === "ipHourly"
      ? "ratelimit:web:contact-message"
      : `ratelimit:web:contact-message-${kind}`;

  limiters[kind] = new Ratelimit({
    redis: new Redis({ url, token }),
    analytics: true,
    prefix,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
  });

  return limiters[kind] ?? null;
}

function getClientIp(request: NextRequest): string {
  const vercelForwardedFor = request.headers
    .get("x-vercel-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  if (vercelForwardedFor) {
    return vercelForwardedFor;
  }

  if (process.env.VERCEL) {
    return "unknown";
  }

  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function getIpRateLimitKey(request: NextRequest): string {
  return createHash("sha256").update(getClientIp(request)).digest("hex");
}

function getEmailRateLimitKey(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function getMoreBindingRateLimit(
  current: RateLimitResult,
  candidate: RateLimitResult
): RateLimitResult {
  if (candidate.remaining !== current.remaining) {
    return candidate.remaining < current.remaining ? candidate : current;
  }

  return candidate.reset > current.reset ? candidate : current;
}

export function getContactRateLimitHeaders(
  result: RateLimitResult,
  includeRetryAfter = false
): Headers {
  const resetSeconds = Math.max(
    0,
    Math.ceil((result.reset - Date.now()) / 1000)
  );

  const headers = new Headers({
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "RateLimit-Reset": String(resetSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
  });

  if (includeRetryAfter) {
    headers.set("Retry-After", String(resetSeconds));
  }

  return headers;
}

const enforceLimit = Effect.fn("enforceContactMessageLimit")(function* (
  kind: LimiterKind,
  key: string
) {
  const ratelimit = getLimiter(kind);
  const config = CONTACT_RATE_LIMITS[kind];

  if (!ratelimit) {
    if (process.env.NODE_ENV === "production") {
      return yield* Effect.fail(
        new ContactMessageRateLimitError({
          message: "Rate limit service is not configured",
          cause: new Error(
            "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set"
          ),
        })
      );
    }

    return {
      limit: config.requests,
      remaining: config.requests,
      reset: Date.now() + config.windowMs,
    };
  }

  const result = yield* Effect.tryPromise({
    try: () => ratelimit.limit(key),
    catch: (cause) =>
      new ContactMessageRateLimitError({
        message: `Failed to enforce ${kind} contact message rate limit`,
        cause,
      }),
  });

  if (result.reason === "timeout") {
    return yield* Effect.fail(
      new ContactMessageRateLimitError({
        message: "Rate limit service timed out",
        cause: new Error("Contact rate limit could not be confirmed"),
      })
    );
  }

  if (!result.success) {
    return yield* Effect.fail(
      new ContactMessageRateLimitExceeded({
        limit: result.limit,
        remaining: Math.max(0, result.remaining),
        reset: result.reset,
      })
    );
  }

  return {
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
});

export const enforceContactVerificationRateLimit = Effect.fn(
  "enforceContactVerificationRateLimit"
)(function* (request: NextRequest) {
  yield* enforceLimit("verificationIpMinute", getIpRateLimitKey(request));
  yield* enforceLimit("verificationGlobalMinute", "global");
});

export const enforceContactMessageRateLimit = Effect.fn(
  "enforceContactMessageRateLimit"
)(function* (request: NextRequest, email: string) {
  const ipKey = getIpRateLimitKey(request);
  const hourlyResult = yield* enforceLimit("ipHourly", ipKey);
  const dailyResult = yield* enforceLimit("ipDaily", ipKey);
  const emailResult = yield* enforceLimit(
    "emailDaily",
    getEmailRateLimitKey(email)
  );
  const globalResult = yield* enforceLimit("globalHourly", "global");

  return [dailyResult, emailResult, globalResult].reduce(
    getMoreBindingRateLimit,
    hourlyResult
  );
});
