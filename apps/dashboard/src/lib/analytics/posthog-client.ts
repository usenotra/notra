"use client";

import type { PostHogEventName } from "@notra/posthog/events";
import type { PostHogProperties } from "@notra/posthog/types/posthog";

import { withPostHog } from "@/lib/analytics/posthog-lazy";

/** Cap so logout/checkout cannot wait on a hung PostHog chunk load. */
const FLUSH_TRACK_EVENT_TIMEOUT_MS = 400;

export function trackEvent(
  event: PostHogEventName,
  properties?: PostHogProperties
): void {
  void withPostHog((posthog) => posthog.capture(event, properties));
}

/**
 * Best-effort capture before a navigation. Starts init if needed, but never
 * blocks longer than `FLUSH_TRACK_EVENT_TIMEOUT_MS`.
 */
export async function flushTrackEvent(
  event: PostHogEventName,
  properties?: PostHogProperties
): Promise<void> {
  if (globalThis.window === undefined) {
    return;
  }

  await Promise.race([
    withPostHog((posthog) => posthog.capture(event, properties)),
    new Promise<void>((resolve) => {
      globalThis.window.setTimeout(resolve, FLUSH_TRACK_EVENT_TIMEOUT_MS);
    }),
  ]);
}

export function trackClientException(
  error: unknown,
  properties?: PostHogProperties
): void {
  void withPostHog((posthog) => posthog.captureException(error, properties));
}
