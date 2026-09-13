import { POSTHOG_PROJECT_TOKEN } from "@/constants/posthog";
import { initPostHog } from "@/lib/analytics/posthog-lazy";

const POSTHOG_INIT_FALLBACK_DELAY_MS = 2000;

if (POSTHOG_PROJECT_TOKEN && typeof window !== "undefined") {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => initPostHog(), {
      timeout: POSTHOG_INIT_FALLBACK_DELAY_MS,
    });
  } else {
    window.setTimeout(() => initPostHog(), POSTHOG_INIT_FALLBACK_DELAY_MS);
  }
}
