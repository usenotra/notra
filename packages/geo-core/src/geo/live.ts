import { realtime } from "@notra/ai/realtime";
import { redis } from "@notra/ai/utils/redis";
import { bumpPurgeGeneration } from "@notra/analytics/cache/query-cache";

import {
  GEO_LIVE_UNWATCHED_MEMO_MS,
  GEO_LIVE_WATCH_MEMO_MS,
  GEO_LIVE_WATCH_TTL_SECONDS,
  GEO_VISIBILITY_LIVE_PROGRESS_INTERVAL_SECONDS,
} from "../constants/geo";
import type { GeoVisibilityLiveStatus } from "../types/geo-live";
import {
  geoLiveChannel,
  geoLiveProgressKey,
  geoLiveWatchKey,
} from "../utils/geo-live";

const watchMemo = new Map<string, { watched: boolean; expiresAt: number }>();

/**
 * Records that a GEO tab of the organization holds a live connection. Called
 * by the realtime route on every (re)connect.
 */
export async function markGeoLiveWatched(
  organizationIds: readonly string[]
): Promise<void> {
  if (!redis || organizationIds.length === 0) {
    return;
  }
  const pipeline = redis.pipeline();
  for (const organizationId of organizationIds) {
    pipeline.set(geoLiveWatchKey(organizationId), 1, {
      ex: GEO_LIVE_WATCH_TTL_SECONDS,
    });
  }
  try {
    await pipeline.exec();
  } catch (error) {
    console.warn("[geo-live] Could not record live viewer", error);
  }
}

/**
 * Whether anyone can receive the organization's live updates. Memoized per
 * process, so a busy site costs one lookup per memo window; "unwatched" only
 * briefly, so a tab that just opened gets its first update quickly. A failed
 * lookup counts as watched: an extra publish beats a missed update.
 */
async function isGeoLiveWatched(organizationId: string): Promise<boolean> {
  const now = Date.now();
  const memo = watchMemo.get(organizationId);
  if (memo && memo.expiresAt > now) {
    return memo.watched;
  }
  let watched = true;
  if (redis) {
    try {
      watched = (await redis.exists(geoLiveWatchKey(organizationId))) > 0;
    } catch {
      watched = true;
    }
  }
  watchMemo.set(organizationId, {
    watched,
    expiresAt:
      now + (watched ? GEO_LIVE_WATCH_MEMO_MS : GEO_LIVE_UNWATCHED_MEMO_MS),
  });
  return watched;
}

/**
 * Announces new AI traffic rows to open GEO tabs. The org's cached traffic
 * queries are purged first, so the refetch this triggers reads Tinybird
 * instead of an entry written before the rows landed.
 */
export async function publishGeoTrafficChange(
  organizationId: string,
  projectIds: string[]
): Promise<void> {
  // Without a viewer the cached traffic queries expire on their own TTL, as
  // before live updates existed; skipping saves the purge and the publish.
  if (!(realtime && (await isGeoLiveWatched(organizationId)))) {
    return;
  }
  await bumpPurgeGeneration("geo", organizationId);
  try {
    await realtime
      .channel(geoLiveChannel(organizationId))
      .emit("geo.traffic", { projectIds });
  } catch (error) {
    console.warn("[geo-live] Could not publish traffic update", error);
  }
}

/**
 * Whether this progress update may go out. Batches finish every few seconds
 * and each announcement makes every viewer refetch the scan's aggregates, so
 * progress is announced at most once per interval and project.
 */
async function claimProgressSlot(projectId: string): Promise<boolean> {
  if (!redis) {
    return true;
  }
  try {
    const claimed = await redis.set(geoLiveProgressKey(projectId), 1, {
      nx: true,
      ex: GEO_VISIBILITY_LIVE_PROGRESS_INTERVAL_SECONDS,
    });
    return claimed === "OK";
  } catch {
    return true;
  }
}

/**
 * Announces scan state; clients refetch scan status and visibility. Start and
 * finish always go out, progress is throttled per project.
 */
export async function publishGeoVisibilityChange(input: {
  organizationId: string;
  projectId: string;
  scanId?: string | null;
  status: GeoVisibilityLiveStatus;
}): Promise<void> {
  if (!realtime) {
    return;
  }
  if (
    input.status === "progress" &&
    !(await claimProgressSlot(input.projectId))
  ) {
    return;
  }
  try {
    await realtime
      .channel(geoLiveChannel(input.organizationId))
      .emit("geo.visibility", {
        projectId: input.projectId,
        scanId: input.scanId ?? null,
        status: input.status,
      });
  } catch (error) {
    console.warn("[geo-live] Could not publish visibility update", error);
  }
}
