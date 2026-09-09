"use client";

import type { PostHog } from "posthog-js";

import { POSTHOG_CONFIG, POSTHOG_PROJECT_TOKEN } from "@/constants/posthog";

/**
 * posthog-js is loaded lazily so its ~70 kB gz bundle stays off the
 * render-blocking app shell. Calls made before `init()` are silently dropped by
 * the SDK (no queueing), so every consumer must go through `withPostHog`, which
 * awaits the same readiness promise the deferred initialisation uses.
 */
let clientPromise: Promise<PostHog | null> | null = null;

async function loadAndInit(): Promise<PostHog | null> {
  if (!POSTHOG_PROJECT_TOKEN) {
    return null;
  }

  const { default: posthog } = await import("posthog-js");

  posthog.init(POSTHOG_PROJECT_TOKEN, {
    ...POSTHOG_CONFIG,
    tracing_headers: [window.location.hostname],
  });

  return posthog;
}

function ensureClient(): Promise<PostHog | null> {
  clientPromise ??= loadAndInit();
  return clientPromise;
}

/** Starts loading and initialising posthog-js if it has not started yet. */
export function initPostHog(): void {
  if (!POSTHOG_PROJECT_TOKEN || typeof window === "undefined") {
    return;
  }

  void ensureClient();
}

/** Runs `callback` once posthog-js is loaded and initialised. */
export async function withPostHog(
  callback: (posthog: PostHog) => void
): Promise<void> {
  if (!POSTHOG_PROJECT_TOKEN || typeof window === "undefined") {
    return;
  }

  const posthog = await ensureClient();
  if (posthog) {
    callback(posthog);
  }
}
