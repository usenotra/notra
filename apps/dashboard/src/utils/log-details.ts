import type { IntegrationType } from "@/types/webhooks/webhooks";

export function getLogDestination(source: IntegrationType, slug: string) {
  if (!slug) {
    return null;
  }
  const base = `/${encodeURIComponent(slug)}`;
  if (source === "schedule") {
    return { href: `${base}/automation/schedules`, label: "Open schedules" };
  }
  if (source === "events") {
    return { href: `${base}/automation/events`, label: "Open event triggers" };
  }
  if (source === "geo") {
    return { href: `${base}/geo`, label: "Open GEO" };
  }
  if (source === "agent-readiness") {
    return {
      href: `${base}/geo/agent-readiness`,
      label: "Open agent readiness",
    };
  }
  if (source === "search-console") {
    return { href: `${base}/geo/traffic`, label: "Open traffic analytics" };
  }
  if (source === "brand") {
    return { href: `${base}/brand/identity`, label: "Open brand identity" };
  }
  if (source === "github" || source === "linear" || source === "slack") {
    return {
      href: `${base}/integrations/${source}`,
      label: "Manage integration",
    };
  }
  return { href: `${base}/integrations`, label: "Open integrations" };
}
