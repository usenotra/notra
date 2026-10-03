import { setDemoSocialSourceProvider } from "@notra/analytics/tinybird/demo-social";
import type {
  DemoPublishedPost,
  DemoSocialAccount,
  DemoSocialSource,
} from "@notra/analytics/types/demo-social";
import { db } from "@notra/db/drizzle";
import {
  connectedSocialAccounts,
  trackedSocialAccounts,
} from "@notra/db/schema";
import { eq } from "drizzle-orm";

import {
  DEMO_PUBLISHED_POSTS_KEY_PREFIX,
  DEMO_PUBLISHED_POSTS_MAX,
  DEMO_PUBLISHED_POSTS_TTL_SECONDS,
} from "../constants/demo-social";
import { redis } from "./redis";

const accountColumns = {
  provider: true,
  providerAccountId: true,
  username: true,
  displayName: true,
  profileImageUrl: true,
  verified: true,
} as const;

async function listDemoSocialAccounts(
  organizationId: string
): Promise<DemoSocialAccount[]> {
  const [connected, tracked] = await Promise.all([
    db.query.connectedSocialAccounts.findMany({
      columns: accountColumns,
      where: eq(connectedSocialAccounts.organizationId, organizationId),
    }),
    db.query.trackedSocialAccounts.findMany({
      columns: accountColumns,
      where: eq(trackedSocialAccounts.organizationId, organizationId),
    }),
  ]);
  return [
    ...connected.map((account) => ({ ...account, kind: "connected" as const })),
    ...tracked.map((account) => ({ ...account, kind: "tracked" as const })),
  ];
}

function publishedPostsKey(organizationId: string): string {
  return `${DEMO_PUBLISHED_POSTS_KEY_PREFIX}${organizationId}`;
}

/**
 * Remembers a post the visitor published from the demo so analytics can
 * show it. Nothing reaches a platform; its stats are generated.
 */
export async function recordDemoPublishedPost(
  organizationId: string,
  post: DemoPublishedPost
): Promise<void> {
  if (!redis) {
    return;
  }
  const key = publishedPostsKey(organizationId);
  await redis
    .pipeline()
    .lpush(key, JSON.stringify(post))
    .ltrim(key, 0, DEMO_PUBLISHED_POSTS_MAX - 1)
    .expire(key, DEMO_PUBLISHED_POSTS_TTL_SECONDS)
    .exec();
}

async function listDemoPublishedPosts(
  organizationId: string
): Promise<DemoPublishedPost[]> {
  if (!redis) {
    return [];
  }
  // Upstash parses JSON values on read.
  return redis.lrange<DemoPublishedPost>(
    publishedPostsKey(organizationId),
    0,
    -1
  );
}

async function loadDemoSocialSource(
  organizationId: string
): Promise<DemoSocialSource> {
  const [accounts, published] = await Promise.all([
    listDemoSocialAccounts(organizationId),
    listDemoPublishedPosts(organizationId).catch((error: unknown) => {
      console.error("[demo] Failed to load published posts", error);
      return [];
    }),
  ]);
  return { accounts, published };
}

/**
 * Serves the public demo's social analytics from the sandbox's seeded (and
 * visitor-tracked) accounts plus anything the visitor published. Called once
 * at startup by the dashboard and API.
 */
export function registerDemoSocialAnalytics() {
  setDemoSocialSourceProvider(loadDemoSocialSource);
}
