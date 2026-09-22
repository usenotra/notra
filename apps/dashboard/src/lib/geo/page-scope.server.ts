import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import { resolveInitialGeoProjectId } from "@/lib/geo/initial-project.server";
import {
  geoProjectRepairPath,
  geoRequestedProjectId,
} from "@/utils/geo-hydration";

type GeoSearch = Record<string, string | string[] | undefined>;

/**
 * Resolve the project the client will use on first paint, and repair a foreign
 * `?project=` before it can miss the prefetched cache. Layouts cannot read
 * search params, so they keep the cookie fallback in `GeoProjectScope`.
 */
export async function loadGeoPageScope(
  slug: string,
  searchParams: Promise<GeoSearch>,
  basePath: string
) {
  const [{ organization, user, member }, requestHeaders, search] =
    await Promise.all([
      validateOrganizationAccess(slug),
      headers(),
      searchParams,
    ]);
  const requestedProjectId = geoRequestedProjectId(search);
  const projectId = await resolveInitialGeoProjectId(
    organization.id,
    slug,
    requestedProjectId
  );

  if (requestedProjectId && requestedProjectId !== projectId) {
    redirect(geoProjectRepairPath(slug, search, projectId, basePath));
  }

  return {
    organizationId: organization.id,
    projectId,
    search,
    requestHeaders,
    membership: member
      ? {
          userId: user.id,
          id: member.id,
          role: member.role,
        }
      : undefined,
  };
}
