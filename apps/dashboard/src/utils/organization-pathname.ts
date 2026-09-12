import { RESERVED_ORGANIZATION_SLUGS } from "@notra/schemas/constants/dashboard/organization";

import { NON_ORGANIZATION_ROUTE_SEGMENTS } from "@/constants/organization-routes";

const reservedSlugs: ReadonlySet<string> = new Set(RESERVED_ORGANIZATION_SLUGS);

export function getFirstPathSegment(pathname: string): string {
  return pathname.split("/").filter(Boolean)[0] ?? "";
}

export function isReservedOrganizationSlug(slug: string): boolean {
  return reservedSlugs.has(slug);
}

export function shouldMaskOrganizationPathname(pathname: string): boolean {
  const firstSegment = getFirstPathSegment(pathname);
  return Boolean(firstSegment) && !isReservedOrganizationSlug(firstSegment);
}

export function maskOrganizationPathname(
  pathname: string,
  replacement: string
): string {
  if (!shouldMaskOrganizationPathname(pathname)) {
    return pathname;
  }

  const segments = pathname.split("/").filter(Boolean);
  segments[0] = replacement;

  return `/${segments.join("/")}`;
}

export function getOrganizationSlugFromPathname(
  pathname: string | null
): string | null {
  if (!pathname) {
    return null;
  }
  const [firstSegment] = pathname.split("/").filter(Boolean);
  if (!firstSegment || NON_ORGANIZATION_ROUTE_SEGMENTS.has(firstSegment)) {
    return null;
  }
  return firstSegment;
}
