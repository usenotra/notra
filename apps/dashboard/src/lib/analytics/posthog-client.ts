"use client";

import type { PostHogEventName } from "@notra/posthog/events";
import type { PostHogProperties } from "@notra/posthog/types/posthog";

import { withPostHog } from "@/lib/analytics/posthog-lazy";

export function trackEvent(
  event: PostHogEventName,
  properties?: PostHogProperties
): void {
  void withPostHog((posthog) => posthog.capture(event, properties));
}

/** Await before logout/checkout redirects so capture is not dropped mid-init. */
export async function flushTrackEvent(
  event: PostHogEventName,
  properties?: PostHogProperties
): Promise<void> {
  await withPostHog((posthog) => posthog.capture(event, properties));
}

export function trackClientException(
  error: unknown,
  properties?: PostHogProperties
): void {
  void withPostHog((posthog) => posthog.captureException(error, properties));
}
