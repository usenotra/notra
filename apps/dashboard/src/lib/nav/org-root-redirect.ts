import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { DEFAULT_SIDEBAR_ENTRY_MODE } from "@/constants/studio-analytics";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import type { OrgRootSearchParams } from "@/types/components/nav";
import {
  getLastVisitedProject,
  getSidebarModeFromCookies,
} from "@/utils/cookies";
import { resolveOrgRootRedirect } from "@/utils/nav";

type OrgRootSearchParamsPromise = Promise<OrgRootSearchParams>;

export async function redirectOrgRootToStoredMode(
  slug: string,
  searchParams: OrgRootSearchParamsPromise
): Promise<void> {
  const [cookieStore, requestHeaders, query] = await Promise.all([
    cookies(),
    headers(),
    searchParams,
  ]);
  const requestedProjectId =
    typeof query.project === "string" ? query.project : undefined;
  const projectId =
    requestedProjectId ?? getLastVisitedProject(cookieStore, slug);
  const storedMode = getSidebarModeFromCookies(cookieStore);
  trackServerEvent({
    event: POSTHOG_EVENTS.DASHBOARD_ENTRY,
    headers: requestHeaders,
    properties: {
      mode: storedMode ?? DEFAULT_SIDEBAR_ENTRY_MODE,
      has_project: Boolean(projectId),
    },
  });
  const path = resolveOrgRootRedirect(slug, storedMode, projectId, query);
  if (path) {
    redirect(path);
  }
}
