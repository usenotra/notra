import { setDemoTrafficProvider } from "@notra/analytics/tinybird/demo-geo-traffic";
import type { DemoTrafficEvent } from "@notra/analytics/types/demo-traffic";
import { db } from "@notra/db/drizzle";
import { geoSettings } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

import {
  GEO_DEMO_PROFILE,
  GEO_DEMO_TRAFFIC_CACHE_MAX_ENTRIES,
  GEO_DEMO_TRAFFIC_CACHE_MS,
  GEO_DEMO_TRAFFIC_DAYS,
} from "../constants/geo-demo";
import { buildGeoSampleTrafficEvents } from "./sample-data";

const cache = new Map<
  string,
  { builtAt: number; events: Promise<DemoTrafficEvent[]> }
>();

/**
 * The sandbox's own hosts (seeded from the visitor's company name), so
 * traffic shows the same domain as the rest of the project.
 */
async function trafficHosts(
  organizationId: string,
  projectId: string
): Promise<readonly string[]> {
  const settings = await db.query.geoSettings.findFirst({
    columns: { domains: true },
    where: projectId
      ? and(
          eq(geoSettings.organizationId, organizationId),
          eq(geoSettings.projectId, projectId)
        )
      : eq(geoSettings.organizationId, organizationId),
  });
  return settings?.domains.length
    ? settings.domains
    : GEO_DEMO_PROFILE.trafficHosts;
}

async function buildEvents(
  organizationId: string,
  projectId: string,
  now: number
): Promise<DemoTrafficEvent[]> {
  return buildGeoSampleTrafficEvents({
    organizationId,
    projectId,
    now: new Date(now),
    profile: {
      ...GEO_DEMO_PROFILE,
      days: GEO_DEMO_TRAFFIC_DAYS,
      trafficHosts: await trafficHosts(organizationId, projectId),
    },
  });
}

/**
 * Serves the public demo's AI traffic from the same deterministic generator
 * the GEO sample seed uses, rebuilt every few minutes so it tracks the clock.
 * Called once at startup by the dashboard and the API.
 */
export function registerGeoDemoTraffic() {
  setDemoTrafficProvider(({ organizationId, projectId }) => {
    const key = `${organizationId}:${projectId}`;
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && now - cached.builtAt < GEO_DEMO_TRAFFIC_CACHE_MS) {
      return cached.events;
    }
    const events = buildEvents(organizationId, projectId, now);
    events.catch(() => {
      if (cache.get(key)?.events === events) {
        cache.delete(key);
      }
    });
    // Bounded: sandboxes come and go, so drop stale and oldest entries.
    for (const [entryKey, entry] of cache) {
      if (now - entry.builtAt >= GEO_DEMO_TRAFFIC_CACHE_MS) {
        cache.delete(entryKey);
      }
    }
    if (cache.size >= GEO_DEMO_TRAFFIC_CACHE_MAX_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) {
        cache.delete(oldest);
      }
    }
    cache.set(key, { builtAt: now, events });
    return events;
  });
}
