"use client";

import type { PostHogEventName } from "@notra/posthog/events";
import type { PostHogProperties } from "@notra/posthog/types/posthog";

import {
  abandonPendingPostHogInit,
  withPostHog,
} from "@/lib/analytics/posthog-lazy";

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
 * blocks longer than `FLUSH_TRACK_EVENT_TIMEOUT_MS`. A timed-out init is
 * abandoned so later events are not stuck on the hung promise.
 */
export async function flushTrackEvent(
  event: PostHogEventName,
  properties?: PostHogProperties
): Promise<void> {
  if (globalThis.window === undefined) {
    return;
  }

  let timeoutId = 0;
  const timeout = new Promise<void>((resolve) => {
    timeoutId = globalThis.window.setTimeout(() => {
      abandonPendingPostHogInit();
      resolve();
    }, FLUSH_TRACK_EVENT_TIMEOUT_MS);
  });

  try {
    await Promise.race([
      withPostHog((posthog) => posthog.capture(event, properties)),
      timeout,
    ]);
  } finally {
    globalThis.window.clearTimeout(timeoutId);
  }
}

export function trackClientException(
  error: unknown,
  properties?: PostHogProperties
): void {
  void withPostHog((posthog) => posthog.captureException(error, properties));
}
