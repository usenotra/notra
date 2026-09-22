import { HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { GeoProjectQueryProvider } from "@/components/providers/geo-project-provider";
import { validateOrganizationAccess } from "@/lib/auth/actions";
import { resolveInitialGeoProjectId } from "@/lib/geo/initial-project.server";
import { loadGeoPageScope } from "@/lib/geo/page-scope.server";
import type { GeoProjectScopeProps } from "@/types/geo";
import {
  dehydrateGeoScopeList,
  dehydrateGeoSettingsQuery,
} from "@/utils/geo-prefetch.server";

type GeoSearch = Record<string, string | string[] | undefined>;

/**
 * Layouts do not receive search params, so the URL's `?project=` (when present)
 * is folded in by `useGeoProjectQueryState` on the client; the server value is
 * only the fallback for the first render.
 */
export async function GeoProjectScope({
  slug,
  children,
}: GeoProjectScopeProps) {
  const [{ organization, user, member }, requestHeaders] = await Promise.all([
    validateOrganizationAccess(slug),
    headers(),
  ]);
  const initialProjectId = await resolveInitialGeoProjectId(
    organization.id,
    slug,
    undefined
  );

  return (
    <HydrationBoundary
      state={await dehydrateGeoSettingsQuery(
        organization.id,
        initialProjectId,
        requestHeaders,
        member && { userId: user.id, id: member.id, role: member.role }
      )}
    >
      <GeoProjectQueryProvider initialProjectId={initialProjectId} key={slug}>
        {children}
      </GeoProjectQueryProvider>
    </HydrationBoundary>
  );
}

export async function GeoScopeListPrefetch({
  slug,
  searchParams,
  basePath,
  procedure,
  children,
}: {
  slug: string;
  searchParams: Promise<GeoSearch>;
  basePath: string;
  procedure:
    | "agentReadiness"
    | "personasList"
    | "writerBriefsList"
    | "writerGaps";
  children: ReactNode;
}) {
  const scope = await loadGeoPageScope(slug, searchParams, basePath);

  return (
    <HydrationBoundary
      state={await dehydrateGeoScopeList(
        procedure,
        scope.organizationId,
        scope.projectId,
        scope.requestHeaders,
        scope.membership
      )}
    >
      {children}
    </HydrationBoundary>
  );
}
