import { GeoProjectQueryProvider } from "@/components/providers/geo-project-provider";
import { validateOrganizationAccess } from "@/lib/auth/actions";
import { resolveInitialGeoProjectId } from "@/lib/geo/initial-project.server";
import type { GeoProjectScopeProps } from "@/types/geo";

/**
 * Layouts do not receive search params, so the URL's `?project=` (when present)
 * is folded in by `useGeoProjectQueryState` on the client; the server value is
 * only the fallback for the first render.
 */
export async function GeoProjectScope({
  slug,
  children,
}: GeoProjectScopeProps) {
  const { organization } = await validateOrganizationAccess(slug);
  const initialProjectId = await resolveInitialGeoProjectId(
    organization.id,
    slug,
    undefined
  );

  return (
    <GeoProjectQueryProvider initialProjectId={initialProjectId} key={slug}>
      {children}
    </GeoProjectQueryProvider>
  );
}
