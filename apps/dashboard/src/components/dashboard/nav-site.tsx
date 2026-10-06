"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@notra/ui/components/ui/sidebar";
import { useTranslations } from "use-intl";

import { SITE_SECTIONS } from "@/constants/sites";
import { useSiteDetail, useSitesOrganizationId } from "@/lib/hooks/use-sites";
import { usePathname } from "@/lib/navigation";
import type { NavSiteProps } from "@/types/components/nav";
import { siteHref } from "@/utils/site-links";
import { siteSectionCount } from "@/utils/site-sections";

import { SidebarLabel } from "./sidebar-label";
import { SidebarNavLink } from "./sidebar-nav-link";

export function NavSite({ slug }: NavSiteProps) {
  const t = useTranslations("sites.detail.tabs");
  const pathname = usePathname();
  const siteId = pathname.split("/").filter(Boolean)[2] ?? "";
  const organizationId = useSitesOrganizationId(slug);
  const { data: detail } = useSiteDetail(organizationId, siteId);
  const basePath = siteHref(slug, siteId);
  const rest = pathname.slice(basePath.length);
  const active =
    SITE_SECTIONS.find(
      (item) =>
        item.path && (rest === item.path || rest.startsWith(`${item.path}/`))
    )?.section ?? "overview";

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <SidebarLabel>{detail?.site.name ?? ""}</SidebarLabel>
      </SidebarGroupLabel>
      <SidebarMenu>
        {SITE_SECTIONS.map((item) => {
          const label = t(item.section);
          const count = siteSectionCount(item.section, detail);
          return (
            <SidebarMenuItem key={item.section}>
              <SidebarMenuButton
                isActive={item.section === active}
                render={
                  <SidebarNavLink href={siteHref(slug, siteId, item.section)}>
                    <HugeiconsIcon icon={item.icon} />
                    <SidebarLabel>{label}</SidebarLabel>
                    {count > 0 ? (
                      <span className="text-muted-foreground ml-auto text-xs tabular-nums group-data-[collapsible=icon]:hidden">
                        {count}
                      </span>
                    ) : null}
                  </SidebarNavLink>
                }
                tooltip={label}
              />
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
