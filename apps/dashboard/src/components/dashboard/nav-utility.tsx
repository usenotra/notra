"use client";

import {
  SidebarGroup,
  SidebarGroupLabel,
} from "@notra/ui/components/ui/sidebar";
import { useTranslations } from "use-intl";

import { NAV_UTILITY_LINKS } from "@/constants/nav";
import { usePathname } from "@/lib/navigation";
import type { NavUtilityProps } from "@/types/components/nav";
import { resolveActiveNavLink } from "@/utils/nav";

import { NavList } from "./nav-list";
import { SidebarLabel } from "./sidebar-label";

export function NavUtility({ slug }: NavUtilityProps) {
  const t = useTranslations("nav.groups");
  const pathname = usePathname();
  const activeLink = resolveActiveNavLink(pathname, slug, NAV_UTILITY_LINKS);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <SidebarLabel>{t("utility")}</SidebarLabel>
      </SidebarGroupLabel>
      <NavList activeLink={activeLink} links={NAV_UTILITY_LINKS} slug={slug} />
    </SidebarGroup>
  );
}
