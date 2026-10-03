import type { QueryKey } from "@tanstack/react-query";

import { dashboardOrpc } from "@/lib/orpc/query";
import { QUERY_KEYS } from "@/utils/query-keys";

/**
 * Which cached dashboard data a demo-api request may have changed. Unknown
 * paths return null so the caller refetches everything: coarse, but never
 * stale.
 */
export function demoInvalidationKeys(path: string): QueryKey[] | null {
  if (path.startsWith("/v1/projects")) {
    return [dashboardOrpc.geo.key()];
  }
  if (path.startsWith("/v1/posts")) {
    return [
      dashboardOrpc.content.key(),
      QUERY_KEYS.POSTS.base,
      QUERY_KEYS.CONTENT.base,
    ];
  }
  if (path.startsWith("/v1/skills")) {
    return [dashboardOrpc.skills.key()];
  }
  if (
    path.startsWith("/v1/schedules") ||
    path.startsWith("/v1/event-triggers")
  ) {
    return [dashboardOrpc.automation.key()];
  }
  if (path.startsWith("/v1/brand-identities")) {
    return [dashboardOrpc.brand.key()];
  }
  if (path.startsWith("/v1/integrations")) {
    return [dashboardOrpc.integrations.key(), QUERY_KEYS.INTEGRATIONS.base];
  }
  return null;
}
