import { redis } from "@notra/ai/utils/redis";
import { db } from "@notra/db/drizzle";
import { projects } from "@notra/db/schema";
import {
  WEB_TRACKING_CACHE_PREFIX,
  WEB_TRACKING_CACHE_TTL_SECONDS,
  WEB_TRACKING_MEMORY_TTL_MS,
} from "@notra/geo-core/constants/web-analytics";
import type { GeoIngestIdentity } from "@notra/geo-core/types/geo";
import { and, eq } from "drizzle-orm";

const memory = new Map<string, { value: boolean; until: number }>();

export async function isVisitorTrackingEnabled(
  identity: GeoIngestIdentity
): Promise<boolean> {
  if (identity.site) {
    return true;
  }
  const { projectId } = identity;
  if (!projectId) {
    return false;
  }
  const key = trackingCacheKey(projectId);
  const hit = memory.get(key);
  if (hit && hit.until > Date.now()) {
    return hit.value;
  }
  const cached = await redis?.get<{ value: boolean }>(key).catch(() => null);
  if (typeof cached?.value === "boolean") {
    rememberInMemory(key, cached.value);
    return cached.value;
  }
  const project = await db.query.projects.findFirst({
    columns: { trackVisitors: true },
    where: and(
      eq(projects.id, projectId),
      eq(projects.organizationId, identity.organizationId)
    ),
  });
  const value = project?.trackVisitors ?? false;
  await rememberVisitorTracking(projectId, value);
  return value;
}

export async function rememberVisitorTracking(
  projectId: string,
  value: boolean
): Promise<void> {
  const key = trackingCacheKey(projectId);
  rememberInMemory(key, value);
  await redis
    ?.set(key, { value }, { ex: WEB_TRACKING_CACHE_TTL_SECONDS })
    .catch(() => null);
}

function trackingCacheKey(projectId: string): string {
  return `${WEB_TRACKING_CACHE_PREFIX}:${projectId}`;
}

function rememberInMemory(key: string, value: boolean): void {
  memory.set(key, { value, until: Date.now() + WEB_TRACKING_MEMORY_TTL_MS });
}
