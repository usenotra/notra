import { getOrganizationSlugFromPathname } from "@/utils/organization-pathname";

export function isContentDetailPathname(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  const organizationSlug = getOrganizationSlugFromPathname(pathname);
  if (!organizationSlug) {
    return false;
  }

  const segments = pathname.split("/").filter(Boolean);
  return segments[1] === "content" && segments.length >= 3;
}
