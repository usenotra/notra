import type { SiteDetail, SiteSection } from "@/types/sites";

export function siteSectionCount(
  section: SiteSection,
  detail: SiteDetail | undefined
): number {
  if (!detail) {
    return 0;
  }
  if (section === "domains") {
    return detail.domains.length;
  }
  return section === "editor" ? detail.draftCount : 0;
}
