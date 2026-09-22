import { CHAT_GENERATION_RATE_LIMIT } from "@notra/ai/constants/rate-limits";
import {
  AGENT_FEEDBACK_RATE_LIMIT_IP_WINDOW_LABEL,
  AGENT_FEEDBACK_RATE_LIMIT_IP_WINDOW_MINUTES,
  AGENT_FEEDBACK_RATE_LIMIT_ORGANIZATION_WINDOW_LABEL,
  AGENT_FEEDBACK_RATE_LIMIT_ORGANIZATION_WINDOW_MINUTES,
  AGENT_FEEDBACK_RATE_LIMIT_PER_IP,
  AGENT_FEEDBACK_RATE_LIMIT_PER_ORGANIZATION,
} from "@notra/db/constants/agent-feedback";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Context } from "hono";

import { trackApiRateLimited } from "./analytics";
import { getOrganizationId } from "./auth";

const redis = Redis.fromEnv();

export const RATE_LIMITS = {
  postGeneration: { requests: 10, window: "1 minute" },
  brandGeneration: { requests: 5, window: "1 minute" },
  chatGeneration: {
    requests: CHAT_GENERATION_RATE_LIMIT.requests,
    window: CHAT_GENERATION_RATE_LIMIT.windowLabel,
  },
  integrationCreate: { requests: 20, window: "1 minute" },
  postUpdate: { requests: 60, window: "1 minute" },
  feedbackIngest: { requests: 120, window: "1 minute" },
  feedbackIngestIp: {
    requests: AGENT_FEEDBACK_RATE_LIMIT_PER_IP,
    window: AGENT_FEEDBACK_RATE_LIMIT_IP_WINDOW_LABEL,
  },
  feedbackIngestOrganization: {
    requests: AGENT_FEEDBACK_RATE_LIMIT_PER_ORGANIZATION,
    window: AGENT_FEEDBACK_RATE_LIMIT_ORGANIZATION_WINDOW_LABEL,
  },
  // GEO. A scan fans out across every engine for every tracked prompt, so it
  // is the most expensive thing an API key can trigger; geo-core's
  // already-running stamp blocks overlap but not a slow drip of runs.
  scanTrigger: { requests: 4, window: "1 hour" },
  // Matches the dashboard's `geoSequenceRun` limiter exactly.
  sequenceRun: { requests: 10, window: "10 minutes" },
  // The dashboard caps imports by row count only. These are conservative
  // per-organization limits for the unattended API surface.
  promptImport: { requests: 10, window: "10 minutes" },
  competitorImport: { requests: 10, window: "10 minutes" },
  competitorSuggestions: { requests: 10, window: "10 minutes" },
  // Matches the dashboard's `geoWriterPlan` limiter exactly. Planning runs a
  // model and books AI credits, so it is throttled like the dashboard does it.
  writerPlan: { requests: 10, window: "10 minutes" },
  // Approving only claims a row and starts a workflow, so it is cheaper than
  // planning — but it does start a paid generation, so it is not free either.
  writerApprove: { requests: 20, window: "10 minutes" },
  // The dashboard does not throttle readiness scans at all; it relies on the
  // feature flag and on geo-core reusing an in-flight scan. An unattended API
  // key has neither habit, so this is a conservative cap.
  agentReadinessScan: { requests: 10, window: "1 hour" },
} as const;

export const ratelimit = {
  postGeneration: new Ratelimit({
    redis,
    prefix: "ratelimit:api:post-generation",
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.postGeneration.requests, "1m"),
  }),
  brandGeneration: new Ratelimit({
    redis,
    prefix: "ratelimit:api:brand-generation",
    limiter: Ratelimit.slidingWindow(
      RATE_LIMITS.brandGeneration.requests,
      "1m"
    ),
  }),
  chatGeneration: new Ratelimit({
    redis,
    prefix: "ratelimit:chat-generation",
    limiter: Ratelimit.slidingWindow(
      CHAT_GENERATION_RATE_LIMIT.requests,
      CHAT_GENERATION_RATE_LIMIT.window
    ),
  }),
  integrationCreate: new Ratelimit({
    redis,
    prefix: "ratelimit:api:integration-create",
    limiter: Ratelimit.slidingWindow(
      RATE_LIMITS.integrationCreate.requests,
      "1m"
    ),
  }),
  postUpdate: new Ratelimit({
    redis,
    prefix: "ratelimit:api:post-update",
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.postUpdate.requests, "1m"),
  }),
  feedbackIngest: new Ratelimit({
    redis,
    prefix: "ratelimit:api:feedback-ingest",
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.feedbackIngest.requests, "1m"),
  }),
  feedbackIngestIp: new Ratelimit({
    redis,
    prefix: "ratelimit:api:feedback-ingest-ip",
    limiter: Ratelimit.slidingWindow(
      RATE_LIMITS.feedbackIngestIp.requests,
      `${AGENT_FEEDBACK_RATE_LIMIT_IP_WINDOW_MINUTES}m`
    ),
  }),
  feedbackIngestOrganization: new Ratelimit({
    redis,
    prefix: "ratelimit:api:feedback-ingest-organization",
    limiter: Ratelimit.slidingWindow(
      RATE_LIMITS.feedbackIngestOrganization.requests,
      `${AGENT_FEEDBACK_RATE_LIMIT_ORGANIZATION_WINDOW_MINUTES}m`
    ),
  }),
  scanTrigger: new Ratelimit({
    redis,
    prefix: "ratelimit:api:geo-scan-trigger",
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.scanTrigger.requests, "1h"),
  }),
  sequenceRun: new Ratelimit({
    redis,
    prefix: "ratelimit:api:geo-sequence-run",
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.sequenceRun.requests, "10m"),
  }),
  promptImport: new Ratelimit({
    redis,
    prefix: "ratelimit:api:geo-prompt-import",
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.promptImport.requests, "10m"),
  }),
  competitorImport: new Ratelimit({
    redis,
    prefix: "ratelimit:api:geo-competitor-import",
    limiter: Ratelimit.slidingWindow(
      RATE_LIMITS.competitorImport.requests,
      "10m"
    ),
  }),
  competitorSuggestions: new Ratelimit({
    redis,
    prefix: "ratelimit:api:geo-competitor-suggestions",
    limiter: Ratelimit.slidingWindow(
      RATE_LIMITS.competitorSuggestions.requests,
      "10m"
    ),
  }),
  writerPlan: new Ratelimit({
    redis,
    prefix: "ratelimit:api:geo-writer-plan",
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.writerPlan.requests, "10m"),
  }),
  writerApprove: new Ratelimit({
    redis,
    prefix: "ratelimit:api:geo-writer-approve",
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.writerApprove.requests, "10m"),
  }),
  agentReadinessScan: new Ratelimit({
    redis,
    prefix: "ratelimit:api:geo-agent-readiness-scan",
    limiter: Ratelimit.slidingWindow(
      RATE_LIMITS.agentReadinessScan.requests,
      "1h"
    ),
  }),
};

type RatelimitScope = "credential" | "organization" | "ip";

function getClientIp(c: Context): string {
  const forwardedFor = c.req.header("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || c.req.header("x-real-ip");
  return ip || "unknown";
}

function getRatelimitKey(c: Context, scope: RatelimitScope): string {
  if (scope === "ip") {
    return getClientIp(c);
  }

  const auth = c.get("auth");
  if (auth) {
    if (scope === "organization") {
      const organizationId = getOrganizationId(c);
      if (organizationId) {
        return organizationId;
      }
    }

    if (auth.keyId) {
      return auth.keyId;
    }
  }

  return getClientIp(c);
}

function setRatelimitHeaders(
  c: Context,
  result: { limit: number; remaining: number; reset: number }
) {
  const resetSeconds = Math.max(
    0,
    Math.ceil((result.reset - Date.now()) / 1000)
  );

  c.header("RateLimit-Limit", String(result.limit));
  c.header("RateLimit-Remaining", String(Math.max(0, result.remaining)));
  c.header("RateLimit-Reset", String(resetSeconds));
  c.header("X-RateLimit-Limit", String(result.limit));
  c.header("X-RateLimit-Remaining", String(Math.max(0, result.remaining)));
  c.header("X-RateLimit-Reset", String(Math.ceil(result.reset / 1000)));

  return resetSeconds;
}

export async function enforceRatelimitForKey(
  c: Context,
  limiter: Ratelimit,
  key: string
) {
  const result = await limiter.limit(key);
  const resetSeconds = setRatelimitHeaders(c, result);

  if (result.success) {
    return null;
  }

  c.header("Retry-After", String(resetSeconds));
  trackApiRateLimited(c, { limit: result.limit });

  return c.json(
    {
      error: "Rate limit exceeded",
      limit: result.limit,
      remaining: Math.max(0, result.remaining),
      reset: result.reset,
    },
    429
  );
}

export function enforceRatelimit(
  c: Context,
  limiter: Ratelimit,
  scope: RatelimitScope = "credential"
) {
  return enforceRatelimitForKey(c, limiter, getRatelimitKey(c, scope));
}
