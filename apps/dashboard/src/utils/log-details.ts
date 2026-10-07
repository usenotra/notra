import type { LogDestination } from "@/types/logs/details-sheet";
import type { IntegrationType } from "@/types/webhooks/webhooks";

export function getLogDestination(
  source: IntegrationType,
  slug: string
): LogDestination | null {
  if (!slug) {
    return null;
  }
  const base = `/${encodeURIComponent(slug)}`;
  if (source === "schedule") {
    return { href: `${base}/automation/schedules`, labelKey: "openSchedules" };
  }
  if (source === "events") {
    return { href: `${base}/automation/events`, labelKey: "openEventTriggers" };
  }
  if (source === "geo") {
    return { href: `${base}/geo`, labelKey: "openGeo" };
  }
  if (source === "agent-readiness") {
    return {
      href: `${base}/geo/agent-readiness`,
      labelKey: "openAgentReadiness",
    };
  }
  if (source === "search-console") {
    return { href: `${base}/geo/traffic`, labelKey: "openTraffic" };
  }
  if (source === "brand") {
    return { href: `${base}/brand/identity`, labelKey: "openBrandIdentity" };
  }
  if (source === "github" || source === "linear" || source === "slack") {
    return {
      href: `${base}/integrations/${source}`,
      labelKey: "manageIntegration",
    };
  }
  return { href: `${base}/integrations`, labelKey: "openIntegrations" };
}
