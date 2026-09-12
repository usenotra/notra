"use client";

import type { PostHogEventName } from "@notra/posthog/events";
import type { PostHogProperties } from "@notra/posthog/types/posthog";

import {
  abandonPendingPostHogInit,
  getPostHogInitGeneration,
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
 * blocks longer than `FLUSH_TRACK_EVENT_TIMEOUT_MS`. Capture uses sendBeacon so
 * a following redirect can still deliver. A hung shared load is abandoned so a
 * later event can retry; a stale timeout cannot drop a newer generation.
 */
export async function flushTrackEvent(
  event: PostHogEventName,
  properties?: PostHogProperties
): Promise<void> {
  if (globalThis.window === undefined) {
    return;
  }

  const capture = withPostHog((posthog) =>
    posthog.capture(event, properties, {
      send_instantly: true,
      transport: "sendBeacon",
    })
  );
  const attempt = getPostHogInitGeneration();

  let timeoutId = 0;
  const timeout = new Promise<void>((resolve) => {
    timeoutId = globalThis.window.setTimeout(() => {
      abandonPendingPostHogInit(attempt);
      resolve();
    }, FLUSH_TRACK_EVENT_TIMEOUT_MS);
  });

  try {
    await Promise.race([capture, timeout]);
  } catch {
    // Best-effort: logout/checkout must proceed even if capture() throws.
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
