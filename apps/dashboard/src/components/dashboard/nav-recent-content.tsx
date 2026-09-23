"use client";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@notra/ui/components/ui/sidebar";
import { usePathname } from "next/navigation";

import {
  CONTENT_NAV_LINK,
  NAV_RECENT_LABEL,
  NAV_RECENT_SKELETON_IDS,
} from "@/constants/nav";
import { useRecentPosts } from "@/lib/hooks/use-posts";
import type { NavRecentContentProps } from "@/types/components/nav";

import { NavRecentContentItem } from "./nav-recent-content-item";
import { SidebarLabel } from "./sidebar-label";

export function NavRecentContent({
  slug,
  organizationId,
  enabled = true,
}: NavRecentContentProps) {
  const pathname = usePathname();
  const { data, isPending } = useRecentPosts(organizationId, enabled);
  const posts = data?.posts ?? [];

  if (!enabled || (!isPending && posts.length === 0)) {
    return null;
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>
        <SidebarLabel>{NAV_RECENT_LABEL}</SidebarLabel>
      </SidebarGroupLabel>
      <SidebarMenu>
        {isPending
          ? NAV_RECENT_SKELETON_IDS.map((id) => (
              <SidebarMenuItem key={id}>
                <SidebarMenuSkeleton />
              </SidebarMenuItem>
            ))
          : posts.map((post) => {
              const href = `/${slug}${CONTENT_NAV_LINK}/${post.id}`;
              return (
                <NavRecentContentItem
                  href={href}
                  isActive={pathname === href}
                  key={post.id}
                  post={{
                    id: post.id,
                    organizationId,
                    status: post.status,
                    title: post.title,
                  }}
                />
              );
            })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
