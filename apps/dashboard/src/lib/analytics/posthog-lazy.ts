"use client";

import type { PostHog } from "posthog-js";

import { POSTHOG_CONFIG, POSTHOG_PROJECT_TOKEN } from "@/constants/posthog";

/**
 * posthog-js is loaded lazily so its ~70 kB gz bundle stays off the
 * render-blocking app shell. Calls made before `init()` are silently dropped by
 * the SDK (no queueing), so every consumer must go through `withPostHog` or
 * `whenPostHogReady`.
 *
 * `withPostHog` starts the idle-shared init (user actions, including redirects).
 * `whenPostHogReady` only runs after a **successful** init so the always-mounted
 * identity provider cannot pull the chunk in before idle, and a failed idle
 * attempt does not permanently skip identify.
 */
type PostHogJsModule = typeof import("posthog-js");

let clientPromise: Promise<PostHog | null> | null = null;
let readyClient: PostHog | null = null;
let initGeneration = 0;
const readyWaiters: Array<(client: PostHog) => void> = [];
let importPostHogJs = (): Promise<PostHogJsModule> => import("posthog-js");

async function loadAndInit(attempt: number): Promise<PostHog | null> {
  if (!POSTHOG_PROJECT_TOKEN) {
    return null;
  }

  const hostname = globalThis.window.location.hostname;
  const { default: posthog } = await importPostHogJs();

  if (attempt !== initGeneration) {
    return null;
  }

  posthog.init(POSTHOG_PROJECT_TOKEN, {
    ...POSTHOG_CONFIG,
    tracing_headers: [hostname],
  });

  return posthog;
}

function notifyReady(client: PostHog): void {
  readyClient = client;
  const waiters = readyWaiters.splice(0);
  for (const resolve of waiters) {
    resolve(client);
  }
}

function ensureClient(): Promise<PostHog | null> {
  if (!clientPromise) {
    const attempt = initGeneration;
    clientPromise = loadAndInit(attempt)
      .then((client) => {
        if (attempt !== initGeneration) {
          return null;
        }
        if (client) {
          notifyReady(client);
        }
        return client;
      })
      .catch((error) => {
        if (attempt === initGeneration) {
          clientPromise = null;
        }
        console.error("Failed to initialize PostHog", error);
        return null;
      });
  }
  return clientPromise;
}

function waitForClient(): Promise<PostHog> {
  if (readyClient) {
    return Promise.resolve(readyClient);
  }

  return new Promise((resolve) => {
    readyWaiters.push(resolve);
  });
}

/**
 * Drops the in-flight init for `attempt` so the next `withPostHog` retries.
 * A later flush's generation is left alone if this timeout is stale.
 */
export function abandonPendingPostHogInit(attempt: number): void {
  if (readyClient || !clientPromise) {
    return;
  }
  if (attempt !== initGeneration) {
    return;
  }

  initGeneration += 1;
  clientPromise = null;
}

/**
 * True when idle `initPostHog` or an earlier `withPostHog` already owns
 * `clientPromise`. A flush must not abandon that shared load.
 */
export function hasSharedPostHogInit(): boolean {
  return readyClient !== null || clientPromise !== null;
}

export function getPostHogInitGeneration(): number {
  return initGeneration;
}

type TestPostHogImport = () => Promise<{
  default: {
    init: (...args: never[]) => unknown;
    capture?: (...args: unknown[]) => unknown;
  };
}>;

/** Test-only: drop client state so a later case can start a fresh init. */
export function resetPostHogForTests(nextImport?: TestPostHogImport): void {
  initGeneration += 1;
  clientPromise = null;
  readyClient = null;
  readyWaiters.length = 0;
  importPostHogJs =
    nextImport === undefined
      ? () => import("posthog-js")
      : () => nextImport() as Promise<PostHogJsModule>;
}

/** Starts loading and initialising posthog-js if it has not started yet. */
export function initPostHog(): void {
  if (!POSTHOG_PROJECT_TOKEN || globalThis.window === undefined) {
    return;
  }

  void ensureClient();
}

/** Runs `callback` once posthog-js is loaded. Starts init if idle has not. */
export async function withPostHog(
  callback: (posthog: PostHog) => void
): Promise<void> {
  if (!POSTHOG_PROJECT_TOKEN || globalThis.window === undefined) {
    return;
  }

  const posthog = await ensureClient();
  if (posthog) {
    callback(posthog);
  }
}

/**
 * Like `withPostHog`, but never starts the dynamic import. Identity sync waits
 * for a successful idle `initPostHog` (or a later user-action `withPostHog`).
 * Failed attempts leave waiters pending so a later retry can still identify.
 */
export async function whenPostHogReady(
  callback: (posthog: PostHog) => void
): Promise<void> {
  if (!POSTHOG_PROJECT_TOKEN || globalThis.window === undefined) {
    return;
  }

  const posthog = await waitForClient();
  callback(posthog);
}
