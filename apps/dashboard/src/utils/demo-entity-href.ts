import type { DemoAffectedEntity } from "@notra/db/types/demo";

/** Dashboard page that shows a record changed through the demo API. */
export function demoEntityHref(
  slug: string,
  entity: DemoAffectedEntity
): string | null {
  switch (entity.type) {
    case "post":
      return `/${slug}/content/${encodeURIComponent(entity.id)}`;
    case "geo.prompt":
    case "geo.sequence":
      return `/${slug}/geo/prompts`;
    case "geo.scan":
      return `/${slug}/geo`;
    case "geo.competitor":
      return `/${slug}/geo/competitors`;
    case "schedule":
      return `/${slug}/automation/schedules`;
    case "event-trigger":
      return `/${slug}/automation/events`;
    case "skill":
      return `/${slug}/skills`;
    default:
      return null;
  }
}
