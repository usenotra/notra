import { COMMAND_ROUTES } from "@/constants/command-palette";
import type { CommandRoute } from "@/types/components/command-palette";
import type { NavVisibility } from "@/types/components/nav";

export function isCommandRouteAvailable(
  route: CommandRoute,
  hasAiCredits: boolean
): boolean {
  return !route.requiresAiCredits || hasAiCredits;
}

export function isCommandRouteVisible(
  route: CommandRoute,
  visibility: NavVisibility
): boolean {
  return !route.flag || visibility[route.flag];
}

export function commandRoutesForAI(
  slug: string,
  hasAiCredits: boolean,
  visibility: NavVisibility
) {
  return COMMAND_ROUTES.filter(
    (r) =>
      isCommandRouteAvailable(r, hasAiCredits) &&
      isCommandRouteVisible(r, visibility)
  ).map((r) => ({
    id: r.id,
    label: r.label,
    path: r.path(slug),
    keywords: r.keywords,
  }));
}
