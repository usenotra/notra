"use client";

import {
  SidebarGroup,
  SidebarGroupLabel,
} from "@notra/ui/components/ui/sidebar";
import { useTranslations } from "next-intl";

import { NAV_GEO_LINKS, NAV_GEO_VISIBILITY_LINKS } from "@/constants/nav";
import { useNavVisibility } from "@/lib/hooks/use-nav-visibility";
import { useHasGeoFeature } from "@/lib/hooks/use-plan";
import type { NavGeoProps } from "@/types/components/nav";
import { resolveActiveNavLink, resolveGeoImproveLinks } from "@/utils/nav";

import { NavList } from "./nav-list";
import { NavLockHint } from "./nav-lock-hint";
import { SidebarLabel } from "./sidebar-label";

export function NavGeo({ slug, pathname, projectId }: NavGeoProps) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const visibility = useNavVisibility();
  const { isLocked: geoLocked } = useHasGeoFeature();
  const activeLink = resolveActiveNavLink(pathname, slug, NAV_GEO_LINKS);
  const showWriteAction = !geoLocked;
  const improveLinks = resolveGeoImproveLinks(showWriteAction);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>
          <SidebarLabel>{tCommon("labels.visibility")}</SidebarLabel>
          {geoLocked && <NavLockHint message={t("geoUpgradeTooltip")} />}
        </SidebarGroupLabel>
        <NavList
          activeLink={activeLink}
          geoLocked={geoLocked}
          links={NAV_GEO_VISIBILITY_LINKS}
          projectId={projectId}
          slug={slug}
          visibility={visibility}
        />
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>
          <SidebarLabel>{t("groups.improve")}</SidebarLabel>
        </SidebarGroupLabel>
        <NavList
          activeLink={activeLink}
          geoLocked={geoLocked}
          links={improveLinks}
          projectId={projectId}
          slug={slug}
          visibility={visibility}
        />
      </SidebarGroup>
    </>
  );
}
