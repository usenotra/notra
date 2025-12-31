"use client";

import { NoteIcon, PlugIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavMain() {
  const { activeOrganization } = useOrganizationsContext();

  if (!activeOrganization?.slug) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            render={
              <Link href={`/${activeOrganization.slug}/integrations`}>
                <HugeiconsIcon icon={PlugIcon} />
                <span>Integrations</span>
              </Link>
            }
          />
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            render={
              <Link href={`/${activeOrganization.slug}/content`}>
                <HugeiconsIcon icon={NoteIcon} />
                <span>Content</span>
              </Link>
            }
          />
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
