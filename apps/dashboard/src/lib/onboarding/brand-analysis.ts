import "server-only";
import { redis } from "@notra/ai/utils/redis";
import { db } from "@notra/db/drizzle";
import { brandSettings } from "@notra/db/schema";
import { warmGeoOnboardingCache } from "@notra/geo-core/geo/onboarding";
import { preferredGeoLanguage } from "@notra/geo-core/utils/geo-locale-language";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { eq } from "drizzle-orm";
import { after } from "next/server";

import { ONBOARDING_BRAND_ANALYSIS_FAILURE_REASONS } from "@/constants/analytics-events";
import { ONBOARDING_BRAND_ANALYSIS_LOCK_TTL_SECONDS } from "@/constants/onboarding";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { readRequestHeaders } from "@/lib/analytics/request-headers";
import { queueBrandAnalysisForOnboarding } from "@/lib/brand-analysis";
import type { QueueBrandAnalysisInput } from "@/types/brand-analysis";
import { ratelimit } from "@/utils/ratelimit";

export async function queueValidatedOnboardingBrandAnalysis(
  input: QueueBrandAnalysisInput,
  userId: string
): Promise<void> {
  const existingBrand = await db.query.brandSettings.findFirst({
    where: eq(brandSettings.organizationId, input.organizationId),
    columns: { id: true },
  });
  if (existingBrand) {
    return;
  }

  const [{ success: withinLimit }, requestHeaders] = await Promise.all([
    ratelimit.onboardingBrandAnalysis.limit(input.organizationId),
    readRequestHeaders(),
  ]);
  const analyticsContext = {
    headers: requestHeaders,
    userId,
    organizationId: input.organizationId,
  };
  if (!withinLimit) {
    trackServerEvent({
      event: POSTHOG_EVENTS.ONBOARDING_BRAND_ANALYSIS_FAILED,
      ...analyticsContext,
      properties: {
        reason: ONBOARDING_BRAND_ANALYSIS_FAILURE_REASONS.RATE_LIMITED,
      },
    });
    throw new Error(
      "Too many onboarding brand analysis requests. Please try again shortly."
    );
  }

  if (redis) {
    const acquired = await redis.set(
      `onboarding:brand-analysis:lock:${input.organizationId}`,
      "1",
      {
        ex: ONBOARDING_BRAND_ANALYSIS_LOCK_TTL_SECONDS,
        nx: true,
      }
    );
    if (acquired !== "OK") {
      throw new Error("Onboarding brand analysis is already in progress.");
    }
  }

  try {
    await queueBrandAnalysisForOnboarding(input);
  } catch (error) {
    trackServerEvent({
      event: POSTHOG_EVENTS.ONBOARDING_BRAND_ANALYSIS_FAILED,
      ...analyticsContext,
      properties: {
        reason: ONBOARDING_BRAND_ANALYSIS_FAILURE_REASONS.QUEUE_FAILED,
      },
    });
    throw error;
  }

  const language = preferredGeoLanguage(requestHeaders?.get("accept-language"));
  after(() =>
    warmGeoOnboardingCache(input.organizationId, input.websiteUrl, language)
  );
  trackServerEvent({
    event: POSTHOG_EVENTS.ONBOARDING_BRAND_ANALYSIS_STARTED,
    ...analyticsContext,
  });
}
