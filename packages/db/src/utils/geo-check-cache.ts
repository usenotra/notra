import { createHash } from "node:crypto";

import { Redis } from "@upstash/redis";

import {
  GEO_CHECK_AGGREGATE_CACHE,
  GEO_CHECK_AGGREGATE_TAG_PREFIX,
  GEO_CHECK_GENERATION_KEY_PREFIX,
  GEO_CHECK_GENERATION_TTL_SECONDS,
  INITIAL_GEO_CHECK_GENERATION,
} from "../constants/geo-check-cache";
import type { GeoCheckScope } from "../types/geo-checks";

interface GeoCheckCacheableQuery extends PromiseLike<unknown> {
  toSQL(): { sql: string; params: unknown[] };
  $withCache(config: {
    config?: { ex: number };
    tag?: string;
    autoInvalidate?: boolean;
  }): this;
}

let client: Redis | null | undefined;

function getRedis(): Redis | null {
  if (client === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    client = url && token ? new Redis({ url, token }) : null;
  }
  return client;
}

function generationKey(organizationId: string): string {
  return `${GEO_CHECK_GENERATION_KEY_PREFIX}:${organizationId}`;
}

// A dashboard render runs several aggregates at once; they share one read.
// Nothing outlives the request: a remembered generation could serve entries
// from before the next scan batch.
const pendingReads = new Map<string, Promise<number | null>>();

function readGeneration(
  redis: Redis,
  organizationId: string
): Promise<number | null> {
  const pending = pendingReads.get(organizationId);
  if (pending) {
    return pending;
  }
  const read = redis
    .get<number>(generationKey(organizationId))
    .then((generation) => generation ?? INITIAL_GEO_CHECK_GENERATION)
    .catch(() => null)
    .finally(() => pendingReads.delete(organizationId));
  pendingReads.set(organizationId, read);
  return read;
}

/**
 * Runs a mention-check aggregate through the query cache, keyed by the SQL,
 * its parameters and the organization's check generation. Drizzle's own key
 * is the same hash without the generation; a tag is the only way to extend
 * it. When the generation cannot be read the query runs uncached rather than
 * risk serving entries from before the latest scan.
 */
export async function withGeoCheckAggregateCache<
  TQuery extends GeoCheckCacheableQuery,
>(scope: GeoCheckScope, query: TQuery): Promise<Awaited<TQuery>> {
  const redis = getRedis();
  const generation = redis
    ? await readGeneration(redis, scope.organizationId)
    : null;
  if (generation === null) {
    return await query;
  }
  const { sql, params } = query.toSQL();
  const hash = createHash("sha256")
    .update(JSON.stringify([sql, params]))
    .digest("base64url");
  return await query.$withCache({
    ...GEO_CHECK_AGGREGATE_CACHE,
    tag: `${GEO_CHECK_AGGREGATE_TAG_PREFIX}:${scope.organizationId}:${generation}:${hash}`,
  });
}

/** Makes every cached aggregate of the organization a miss. Best effort. */
export async function bumpGeoCheckGeneration(
  organizationIds: Iterable<string>
): Promise<void> {
  const redis = getRedis();
  const ids = [...new Set(organizationIds)];
  if (!redis || ids.length === 0) {
    return;
  }
  const pipeline = redis.pipeline();
  for (const organizationId of ids) {
    pipeline.incr(generationKey(organizationId));
    pipeline.expire(
      generationKey(organizationId),
      GEO_CHECK_GENERATION_TTL_SECONDS
    );
  }
  try {
    await pipeline.exec();
  } catch (error) {
    console.warn("[geo-checks] Could not bump the aggregate generation", error);
  }
}

const EMPTY_SHELF_SYNC_TTL_SECONDS = 86_400;

function emptyShelfSyncKey(projectId: string): string {
  return `geo-shelf-empty-sync:${projectId}`;
}

/**
 * Whether a shelf citation sync already found nothing to import at the
 * organization's current check generation. The sync scans the project's whole
 * mention-check history, so a project without cited pages would otherwise pay
 * for it on every shelf view. A new scan bumps the generation and re-enables
 * the sync. Without Redis the answer is always "not synced".
 *
 * Returns the generation read here so an empty sync is recorded against the
 * generation it actually covered: a scan that lands during the sync bumps the
 * generation and must not be marked as synced.
 */
export async function readEmptyShelfSync(
  scope: GeoCheckScope & { projectId: string }
): Promise<{ current: boolean; generation: number | null }> {
  const redis = getRedis();
  if (!redis) {
    return { current: false, generation: null };
  }
  const generation = await readGeneration(redis, scope.organizationId);
  if (generation === null) {
    return { current: false, generation: null };
  }
  const synced = await redis
    .get<number>(emptyShelfSyncKey(scope.projectId))
    .catch(() => null);
  return { current: synced === generation, generation };
}

export async function markEmptyShelfSync(
  scope: GeoCheckScope & { projectId: string },
  generation: number
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }
  await redis
    .set(emptyShelfSyncKey(scope.projectId), generation, {
      ex: EMPTY_SHELF_SYNC_TTL_SECONDS,
    })
    .catch(() => undefined);
}
