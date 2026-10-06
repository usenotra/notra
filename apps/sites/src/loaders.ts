import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import {
  siteHostRecordSchema,
  siteManifestSchema,
  siteServingStateSchema,
} from "@notra/sites-core/schemas/deployment";
import type {
  SiteHostRecord,
  SiteServingState,
} from "@notra/sites-core/types/deployment";

import {
  HOST_TTL_MS,
  MANIFEST_CACHE_LIMIT,
  STATE_TTL_MS,
} from "./constants/cache";
import type { LoadedManifest, TimedCacheEntry } from "./types/serving";
import type { SiteBucketObject, SitesDeps } from "./types/worker";

const hostCache = new Map<string, TimedCacheEntry<SiteHostRecord | null>>();
const stateCache = new Map<string, TimedCacheEntry<SiteServingState | null>>();
const manifestCache = new Map<string, LoadedManifest>();

export function resetCachesForTests() {
  hostCache.clear();
  stateCache.clear();
  manifestCache.clear();
}

export class StateUnavailableError extends Error {
  readonly name = "StateUnavailableError";
}

async function readJson(deps: SitesDeps, key: string): Promise<unknown> {
  let object: SiteBucketObject | null;
  try {
    object = await deps.bucket.get(key);
  } catch (error) {
    throw new StateUnavailableError(
      `R2 read failed for ${key}: ${String(error)}`
    );
  }
  return object ? JSON.parse(await object.text()) : null;
}

async function loadWithTtl<T>(
  deps: SitesDeps,
  cache: Map<string, TimedCacheEntry<T>>,
  key: string,
  ttlMs: number,
  load: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  if (cached && deps.now().getTime() - cached.at < ttlMs) {
    return cached.value;
  }
  const value = await load();
  cache.set(key, { value, at: deps.now().getTime() });
  return value;
}

export function loadHost(
  deps: SitesDeps,
  hostname: string
): Promise<SiteHostRecord | null> {
  return loadWithTtl(deps, hostCache, hostname, HOST_TTL_MS, async () => {
    const raw = await readJson(deps, SITE_R2_KEYS.host(hostname));
    const parsed = raw ? siteHostRecordSchema.safeParse(raw) : null;
    return parsed?.success ? parsed.data : null;
  });
}

export function loadState(
  deps: SitesDeps,
  siteId: string
): Promise<SiteServingState | null> {
  return loadWithTtl(deps, stateCache, siteId, STATE_TTL_MS, async () => {
    const raw = await readJson(deps, SITE_R2_KEYS.state(siteId));
    if (raw === null) {
      return null;
    }
    const parsed = siteServingStateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new StateUnavailableError(`Invalid serving state for ${siteId}`);
    }
    return parsed.data;
  });
}

export async function loadManifest(
  deps: SitesDeps,
  siteId: string,
  deploymentId: string
): Promise<LoadedManifest | null> {
  const cacheKey = `${siteId}/${deploymentId}`;
  const cached = manifestCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const raw = await readJson(deps, SITE_R2_KEYS.manifest(siteId, deploymentId));
  if (!raw) {
    return null;
  }
  const manifest = siteManifestSchema.parse(raw);
  if (manifest.siteId !== siteId || manifest.deploymentId !== deploymentId) {
    throw new StateUnavailableError(
      `Manifest ${cacheKey} does not match its location`
    );
  }
  const loaded = {
    manifest,
    files: new Map(manifest.files.map((file) => [file.path, file])),
  };
  if (manifestCache.size >= MANIFEST_CACHE_LIMIT) {
    const oldest = manifestCache.keys().next().value;
    if (oldest) {
      manifestCache.delete(oldest);
    }
  }
  manifestCache.set(cacheKey, loaded);
  return loaded;
}
