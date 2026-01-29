"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@notra/ui/components/ui/sidebar";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

interface NavSecondaryItem {
  label: string;
  url: string;
  icon: IconSvgElement;
}

const items: readonly NavSecondaryItem[] = [];

export function NavSecondary({
  ...props
}: ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { activeOrganization } = useOrganizationsContext();

  if (!activeOrganization?.slug) {
    return null;
  }

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                render={
                  <Link href={item.url}>
                    <HugeiconsIcon icon={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                }
                tooltip={item.label}
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
