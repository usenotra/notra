"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@notra/ui/components/ui/sidebar";
import { useTranslations } from "next-intl";

import { BRAND_IDENTITY_TAB_LABEL_KEYS } from "@/constants/brand-identity";
import { useNavBrandIdentity } from "@/lib/hooks/use-nav-brand-identity";
import type {
  NavBrandIdentityLinkProps,
  NavBrandIdentityProps,
  NavCountBadgeProps,
} from "@/types/components/nav";

import { SidebarLabel } from "./sidebar-label";
import { SidebarNavLink } from "./sidebar-nav-link";

export function NavBrandIdentity({ slug }: NavBrandIdentityProps) {
  const tCommon = useTranslations("common");
  const model = useNavBrandIdentity(slug);

  if (!model) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <SidebarLabel>{tCommon("labels.brandIdentity")}</SidebarLabel>
      </SidebarGroupLabel>
      <SidebarMenu>
        {model.items.map((item) => (
          <NavBrandIdentityLink item={item} key={item.tab} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavBrandIdentityLink({ item }: NavBrandIdentityLinkProps) {
  const t = useTranslations("common.labels");
  const label = t(BRAND_IDENTITY_TAB_LABEL_KEYS[item.tab]);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={item.isActive}
        render={
          <SidebarNavLink href={item.href} replace>
            <HugeiconsIcon icon={item.icon} />
            <SidebarLabel>{label}</SidebarLabel>
            <NavCountBadge count={item.count} />
          </SidebarNavLink>
        }
        tooltip={label}
      />
    </SidebarMenuItem>
  );
}

function NavCountBadge({ count }: NavCountBadgeProps) {
  if (count === null) {
    return null;
  }

  if (count <= 0) {
    return null;
  }

  return (
    <span className="text-muted-foreground ml-auto text-xs tabular-nums group-data-[collapsible=icon]:hidden">
      {count}
    </span>
  );
}
