import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import {
  type SiteHostRecord,
  type SiteManifest,
  type SiteManifestFile,
  type SiteServingState,
  siteHostRecordSchema,
  siteManifestSchema,
  siteServingStateSchema,
} from "@notra/sites-core/schemas/deployment";

import type { SitesDeps } from "./types";

/**
 * Serving state is re-read at most this often per isolate. It bounds how long
 * a takedown or a new release takes to show up, independent of any edge cache.
 */
const STATE_TTL_MS = 5000;
const HOST_TTL_MS = 30_000;
const MANIFEST_CACHE_LIMIT = 32;

export interface LoadedManifest {
  manifest: SiteManifest;
  files: Map<string, SiteManifestFile>;
}

const hostCache = new Map<
  string,
  { value: SiteHostRecord | null; at: number }
>();
const stateCache = new Map<
  string,
  { value: SiteServingState | null; at: number }
>();
/** Deployments are immutable, so a manifest never needs revalidation. */
const manifestCache = new Map<string, LoadedManifest>();

export function resetCachesForTests() {
  hostCache.clear();
  stateCache.clear();
  manifestCache.clear();
}

export class StateUnavailableError extends Error {
  readonly name = "StateUnavailableError";
}

async function readJson(deps: SitesDeps, key: string): Promise<unknown | null> {
  let object: Awaited<ReturnType<SitesDeps["bucket"]["get"]>>;
  try {
    object = await deps.bucket.get(key);
  } catch (error) {
    throw new StateUnavailableError(
      `R2 read failed for ${key}: ${String(error)}`
    );
  }
  if (!object) {
    return null;
  }
  return JSON.parse(await object.text());
}

export async function loadHost(
  deps: SitesDeps,
  hostname: string
): Promise<SiteHostRecord | null> {
  const cached = hostCache.get(hostname);
  if (cached && deps.now().getTime() - cached.at < HOST_TTL_MS) {
    return cached.value;
  }
  const raw = await readJson(deps, SITE_R2_KEYS.host(hostname));
  const parsed = raw ? siteHostRecordSchema.safeParse(raw) : null;
  const value = parsed?.success ? parsed.data : null;
  hostCache.set(hostname, { value, at: deps.now().getTime() });
  return value;
}

export async function loadState(
  deps: SitesDeps,
  siteId: string
): Promise<SiteServingState | null> {
  const cached = stateCache.get(siteId);
  if (cached && deps.now().getTime() - cached.at < STATE_TTL_MS) {
    return cached.value;
  }
  const raw = await readJson(deps, SITE_R2_KEYS.state(siteId));
  if (raw === null) {
    stateCache.set(siteId, { value: null, at: deps.now().getTime() });
    return null;
  }
  const parsed = siteServingStateSchema.safeParse(raw);
  if (!parsed.success) {
    // A state we cannot read is treated like an outage: fail closed.
    throw new StateUnavailableError(`Invalid serving state for ${siteId}`);
  }
  stateCache.set(siteId, { value: parsed.data, at: deps.now().getTime() });
  return parsed.data;
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
