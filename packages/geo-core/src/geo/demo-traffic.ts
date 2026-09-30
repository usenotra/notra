import { setDemoTrafficProvider } from "@notra/analytics/tinybird/demo-geo-traffic";
import type { DemoTrafficEvent } from "@notra/analytics/types/demo-traffic";

import {
  GEO_DEMO_PROFILE,
  GEO_DEMO_TRAFFIC_CACHE_MS,
  GEO_DEMO_TRAFFIC_DAYS,
} from "../constants/geo-demo";
import { buildGeoSampleTrafficEvents } from "./sample-data";

const cache = new Map<
  string,
  { builtAt: number; events: DemoTrafficEvent[] }
>();

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
    const events = buildGeoSampleTrafficEvents({
      organizationId,
      projectId,
      now: new Date(now),
      profile: { ...GEO_DEMO_PROFILE, days: GEO_DEMO_TRAFFIC_DAYS },
    });
    cache.set(key, { builtAt: now, events });
    return events;
  });
}
