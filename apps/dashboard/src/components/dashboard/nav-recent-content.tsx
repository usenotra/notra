"use client";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@notra/ui/components/ui/sidebar";
import { cn } from "@notra/ui/lib/utils";
import { usePathname } from "next/navigation";

import {
  CONTENT_NAV_LINK,
  NAV_RECENT_LABEL,
  NAV_RECENT_LIMIT,
  NAV_RECENT_SKELETON_IDS,
  NAV_RECENT_TITLE_CLASS,
  POST_STATUS_DOT_CLASS,
  POST_STATUS_LABELS,
} from "@/constants/nav";
import { usePosts } from "@/lib/hooks/use-posts";
import type { NavRecentContentProps } from "@/types/components/nav";

import { SidebarLabel } from "./sidebar-label";
import { SidebarNavLink } from "./sidebar-nav-link";

export function NavRecentContent({
  slug,
  organizationId,
  enabled = true,
}: NavRecentContentProps) {
  const pathname = usePathname();
  // Request only what the sidebar shows — a full page ships every post body.
  const { data, isPending } = usePosts(
    organizationId,
    1,
    enabled,
    NAV_RECENT_LIMIT
  );
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
                <SidebarMenuItem key={post.id}>
                  <SidebarMenuButton
                    isActive={pathname === href}
                    render={
                      <SidebarNavLink href={href}>
                        <span
                          aria-hidden="true"
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            POST_STATUS_DOT_CLASS[post.status]
                          )}
                        />
                        <span className={NAV_RECENT_TITLE_CLASS}>
                          {post.title}
                        </span>
                        <span className="text-muted-foreground ml-auto shrink-0 text-[0.625rem]">
                          {POST_STATUS_LABELS[post.status]}
                        </span>
                      </SidebarNavLink>
                    }
                    size="sm"
                  />
                </SidebarMenuItem>
              );
            })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
