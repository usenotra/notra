import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import { COMPANY_LOGO_RATE_LIMIT_PER_QUERY_PER_MINUTE } from "@/constants/company-logo";

const redis = Redis.fromEnv();

export const ratelimit = {
  fetchTweet: new Ratelimit({
    redis,
    prefix: "ratelimit:fetch-tweet",
    limiter: Ratelimit.slidingWindow(30, "1m"),
  }),
  importTweets: new Ratelimit({
    redis,
    prefix: "ratelimit:import-tweets",
    limiter: Ratelimit.slidingWindow(20, "1m"),
  }),
  mcpConnection: new Ratelimit({
    redis,
    prefix: "ratelimit:mcp-connection",
    limiter: Ratelimit.slidingWindow(10, "1m"),
  }),
  githubProbe: new Ratelimit({
    redis,
    prefix: "ratelimit:github-probe",
    limiter: Ratelimit.slidingWindow(30, "1m"),
  }),
  githubAppRepositories: new Ratelimit({
    redis,
    prefix: "ratelimit:github-app-repositories",
    limiter: Ratelimit.slidingWindow(60, "1m"),
  }),
  githubAppCallback: new Ratelimit({
    redis,
    prefix: "ratelimit:github-app-callback",
    limiter: Ratelimit.slidingWindow(10, "1m"),
  }),
  githubPublish: new Ratelimit({
    redis,
    prefix: "ratelimit:github-publish",
    limiter: Ratelimit.slidingWindow(10, "1m"),
  }),
  granolaConnection: new Ratelimit({
    redis,
    prefix: "ratelimit:granola-connection",
    limiter: Ratelimit.slidingWindow(10, "1m"),
  }),
  internalWorkflowStart: new Ratelimit({
    redis,
    prefix: "ratelimit:internal-workflow-start",
    limiter: Ratelimit.slidingWindow(30, "1m"),
  }),
  onboardingBrandAnalysis: new Ratelimit({
    redis,
    prefix: "ratelimit:onboarding-brand-analysis",
    limiter: Ratelimit.slidingWindow(2, "10m"),
  }),
  companyLogo: new Ratelimit({
    redis,
    prefix: "ratelimit:company-logo",
    limiter: Ratelimit.slidingWindow(
      COMPANY_LOGO_RATE_LIMIT_PER_QUERY_PER_MINUTE,
      "1m"
    ),
  }),
  onboardingAgent: new Ratelimit({
    redis,
    prefix: "ratelimit:onboarding-agent",
    limiter: Ratelimit.slidingWindow(2, "10m"),
  }),
  commandPaletteNavigate: new Ratelimit({
    redis,
    prefix: "ratelimit:cmdk-navigate",
    limiter: Ratelimit.slidingWindow(15, "1m"),
  }),
  chatStream: new Ratelimit({
    redis,
    prefix: "ratelimit:chat-stream",
    limiter: Ratelimit.slidingWindow(30, "1m"),
  }),
  chatStop: new Ratelimit({
    redis,
    prefix: "ratelimit:chat-stop",
    limiter: Ratelimit.slidingWindow(30, "1m"),
  }),
  chatRelay: new Ratelimit({
    redis,
    prefix: "ratelimit:chat-relay",
    limiter: Ratelimit.slidingWindow(20, "1m"),
  }),
  geoIngest: new Ratelimit({
    redis,
    prefix: "ratelimit:geo-ingest",
    limiter: Ratelimit.slidingWindow(1000, "1m"),
  }),
  slackOAuth: new Ratelimit({
    redis,
    prefix: "ratelimit:slack-oauth",
    limiter: Ratelimit.slidingWindow(10, "10m"),
  }),
  gscOAuth: new Ratelimit({
    redis,
    prefix: "ratelimit:gsc-oauth",
    limiter: Ratelimit.slidingWindow(10, "10m"),
  }),
  geoWriterPlan: new Ratelimit({
    redis,
    prefix: "ratelimit:geo-writer-plan",
    limiter: Ratelimit.slidingWindow(10, "10m"),
  }),
  geoSequenceRun: new Ratelimit({
    redis,
    prefix: "ratelimit:geo-sequence-run",
    limiter: Ratelimit.slidingWindow(10, "10m"),
  }),
  geoSequencesGenerate: new Ratelimit({
    redis,
    prefix: "ratelimit:geo-sequences-generate",
    limiter: Ratelimit.slidingWindow(5, "10m"),
  }),
  geoPersonasGenerate: new Ratelimit({
    redis,
    prefix: "ratelimit:geo-personas-generate",
    limiter: Ratelimit.slidingWindow(5, "10m"),
  }),
  geoPersonaRun: new Ratelimit({
    redis,
    prefix: "ratelimit:geo-persona-run",
    limiter: Ratelimit.slidingWindow(10, "10m"),
  }),
  geoCompetitorSuggestions: new Ratelimit({
    redis,
    prefix: "ratelimit:geo-competitor-suggestions",
    limiter: Ratelimit.slidingWindow(10, "10m"),
  }),
  geoBrandSearch: new Ratelimit({
    redis,
    prefix: "ratelimit:geo-brand-search",
    limiter: Ratelimit.slidingWindow(60, "1m"),
  }),
  geoShelfPreview: new Ratelimit({
    redis,
    prefix: "ratelimit:geo-shelf-preview",
    limiter: Ratelimit.slidingWindow(30, "1m"),
  }),
  gscSync: new Ratelimit({
    redis,
    prefix: "ratelimit:gsc-sync",
    limiter: Ratelimit.slidingWindow(5, "10m"),
  }),
  signIn: new Ratelimit({
    redis,
    prefix: "ratelimit:auth-sign-in",
    limiter: Ratelimit.slidingWindow(5, "1m"),
  }),
  signUp: new Ratelimit({
    redis,
    prefix: "ratelimit:auth-sign-up",
    limiter: Ratelimit.slidingWindow(5, "1m"),
  }),
  forgotPassword: new Ratelimit({
    redis,
    prefix: "ratelimit:auth-forgot-password",
    limiter: Ratelimit.slidingWindow(3, "1m"),
  }),
  socialSignInStart: new Ratelimit({
    redis,
    prefix: "ratelimit:auth-social-start",
    limiter: Ratelimit.slidingWindow(10, "1m"),
  }),
  mfaVerify: new Ratelimit({
    redis,
    analytics: true,
    prefix: "ratelimit:auth-mfa-verify",
    limiter: Ratelimit.slidingWindow(5, "1m"),
  }),
  backupCode: new Ratelimit({
    redis,
    analytics: true,
    prefix: "ratelimit:auth-backup-code",
    limiter: Ratelimit.slidingWindow(5, "10m"),
  }),
};

export function getClientIpFromHeaders(headersList: Headers): string {
  if (process.env.VERCEL !== "1") {
    return `unknown:${crypto.randomUUID()}`;
  }

  return (
    headersList.get("x-vercel-forwarded-for")?.trim() ||
    `unknown:${crypto.randomUUID()}`
  );
}

export function getClientIp(request: NextRequest): string {
  if (process.env.VERCEL !== "1") {
    return "unknown";
  }

  return request.headers.get("x-vercel-forwarded-for")?.trim() || "unknown";
}

export async function isRateLimited(
  limiter: Ratelimit,
  key: string
): Promise<boolean> {
  if (shouldSkipRateLimiting()) {
    return false;
  }

  const headersList = await headers();
  const ip = getClientIpFromHeaders(headersList);
  const { success } = await limiter.limit(`${ip}:${key.toLowerCase()}`);
  return !success;
}

export async function isAccountRateLimited(
  limiter: Ratelimit,
  key: string
): Promise<boolean> {
  if (shouldSkipRateLimiting()) {
    return false;
  }
  const { success } = await limiter.limit(key.toLowerCase());
  return !success;
}

function shouldSkipRateLimiting() {
  return (
    process.env.NODE_ENV !== "production" &&
    (!process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN)
  );
}
