"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import { useStoredSidebarMode } from "@/lib/hooks/use-sidebar-mode";
import type { OrgRootSearchParams } from "@/types/components/nav";
import { isOrgRootPath, resolveOrgRootRedirect } from "@/utils/nav";

function toOrgRootSearchParams(
  searchParams: URLSearchParams
): OrgRootSearchParams {
  const params: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    params[key] = values.length === 1 ? (values[0] as string) : values;
  }
  return params;
}

/**
 * Fallback for a GEO pick that only lives in localStorage (no cookie yet).
 * The org-root page already server-redirects when the cookie is present.
 */
export function RestoreSidebarHome() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeOrganization } = useOrganizationsContext();
  const [projectParam] = useGeoProjectQueryState();
  const storedMode = useStoredSidebarMode();
  const slug = activeOrganization?.slug;
  const redirectTo =
    slug && isOrgRootPath(pathname, slug)
      ? resolveOrgRootRedirect(
          slug,
          storedMode,
          projectParam ?? undefined,
          // Keep deep-link params such as `?settings=general`; under PPR this
          // client redirect can win the race against the server redirect.
          toOrgRootSearchParams(searchParams)
        )
      : null;

  useEffect(() => {
    if (!redirectTo) {
      return;
    }
    // react-doctor-disable-next-line nextjs-no-client-side-redirect -- fallback when the mode cookie is missing
    router.replace(redirectTo);
  }, [redirectTo, router]);

  return null;
}
