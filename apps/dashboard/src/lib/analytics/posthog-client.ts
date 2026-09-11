"use client";

import type { PostHogEventName } from "@notra/posthog/events";
import type { PostHogProperties } from "@notra/posthog/types/posthog";

import {
  abandonPendingPostHogInit,
  getPostHogInitGeneration,
  hasSharedPostHogInit,
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
 * blocks longer than `FLUSH_TRACK_EVENT_TIMEOUT_MS`. Only an init this flush
 * started is abandoned on timeout; a shared idle `clientPromise` is left
 * running so identify and later events can still complete.
 */
export async function flushTrackEvent(
  event: PostHogEventName,
  properties?: PostHogProperties
): Promise<void> {
  if (globalThis.window === undefined) {
    return;
  }

  const joinedSharedInit = hasSharedPostHogInit();
  const capture = withPostHog((posthog) => posthog.capture(event, properties));
  const attempt = getPostHogInitGeneration();

  let timeoutId = 0;
  const timeout = new Promise<void>((resolve) => {
    timeoutId = globalThis.window.setTimeout(() => {
      if (!joinedSharedInit) {
        abandonPendingPostHogInit(attempt);
      }
      resolve();
    }, FLUSH_TRACK_EVENT_TIMEOUT_MS);
  });

  try {
    await Promise.race([capture, timeout]);
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
