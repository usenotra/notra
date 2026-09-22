import { HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { GeoProjectQueryProvider } from "@/components/providers/geo-project-provider";
import { validateOrganizationAccess } from "@/lib/auth/actions";
import { resolveInitialGeoProjectId } from "@/lib/geo/initial-project.server";
import type { GeoProjectScopeProps } from "@/types/geo";
import {
  dehydrateGeoScopeList,
  dehydrateGeoSettingsQuery,
} from "@/utils/geo-prefetch.server";

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
  procedure,
  children,
}: {
  slug: string;
  procedure:
    | "agentReadiness"
    | "personasList"
    | "writerBriefsList"
    | "writerGaps";
  children: ReactNode;
}) {
  const [{ organization, user, member }, requestHeaders] = await Promise.all([
    validateOrganizationAccess(slug),
    headers(),
  ]);
  const projectId = await resolveInitialGeoProjectId(
    organization.id,
    slug,
    undefined
  );

  return (
    <HydrationBoundary
      state={await dehydrateGeoScopeList(
        procedure,
        organization.id,
        projectId,
        requestHeaders,
        member && { userId: user.id, id: member.id, role: member.role }
      )}
    >
      {children}
    </HydrationBoundary>
  );
}
