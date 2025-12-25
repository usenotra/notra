"use client";

import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { setLastVisitedOrganization } from "@/utils/cookies";
import { QUERY_KEYS } from "@/utils/query-keys";
import {
  type Organization,
  useOrganizationsContext,
} from "../providers/organization-provider";

function OrgSelectorTrigger({
  isCollapsed,
  isSwitching,
  activeOrganization,
}: {
  isCollapsed: boolean;
  isSwitching: boolean;
  activeOrganization: Organization | null;
}) {
  return (
    <DropdownMenuTrigger
      render={
        <SidebarMenuButton
          className={cn(
            "cursor-pointer border border-transparent transition hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
            isCollapsed ? "size-10 min-w-0 justify-center rounded-full p-1" : ""
          )}
          disabled={isSwitching}
          size="lg"
        >
          <Avatar className={cn("size-8", isCollapsed ? "size-6.5" : "")}>
            <AvatarImage
              className="rounded-[4px]"
              src={activeOrganization?.logo || undefined}
            />
            <AvatarFallback className="border bg-sidebar-accent">
              {activeOrganization?.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {isCollapsed ? null : (
            <>
              <div className="flex flex-1 gap-2 text-left text-sm leading-tight">
                <span className="truncate text-ellipsis font-medium text-sm">
                  {activeOrganization?.name}
                </span>
              </div>
              <HugeiconsIcon className="ml-auto" icon={ArrowDown01Icon} />
            </>
          )}
        </SidebarMenuButton>
      }
    />
  );
}

function OrgSelectorSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  if (isCollapsed) {
    return null;
  }

  return (
    <SidebarMenuButton disabled size="lg">
      <Skeleton className="size-8 rounded-[4px]" />
      <div className="flex flex-1 gap-2 text-left text-sm leading-tight">
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="ml-auto size-4" />
    </SidebarMenuButton>
  );
}

export function OrgSelector() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { activeOrganization, organizations, isLoading } =
    useOrganizationsContext();

  const [isSwitching, setIsSwitching] = useState(false);

  async function switchOrganization(org: Organization) {
    if (org.slug === activeOrganization?.slug) {
      return;
    }

    setIsSwitching(true);

    try {
      const { error } = await authClient.organization.setActive({
        organizationId: org.id,
      });

      if (error) {
        toast.error(error.message || "Failed to switch organization");
        return;
      }

      setLastVisitedOrganization(org.slug);

      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AUTH.activeOrganization,
      });

      router.push(`/${org.slug}`);
    } catch (error) {
      console.error("Failed to switch organization:", error);
      toast.error("Failed to switch organization");
    } finally {
      setIsSwitching(false);
    }
  }

  const showSkeleton = !activeOrganization && isLoading;
  const shouldShowTrigger = Boolean(activeOrganization) && !showSkeleton;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          {shouldShowTrigger ? (
            <OrgSelectorTrigger
              activeOrganization={activeOrganization}
              isCollapsed={isCollapsed}
              isSwitching={isSwitching}
            />
          ) : (
            <OrgSelectorSkeleton isCollapsed={isCollapsed} />
          )}
          <DropdownMenuContent
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {organizations?.length ? (
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  Organizations
                </DropdownMenuLabel>
                {organizations.map((org) => (
                  <DropdownMenuItem key={org.id}>
                    <button
                      className="relative flex w-full cursor-pointer items-center gap-4 disabled:opacity-50"
                      disabled={isSwitching}
                      onClick={() => switchOrganization(org)}
                      type="button"
                    >
                      <Avatar className="size-6 rounded-[0.2rem]">
                        <AvatarImage src={org.logo || undefined} />
                        <AvatarFallback>{org.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      {org.name}
                      {activeOrganization?.id === org.id ? (
                        <HugeiconsIcon
                          className="absolute right-0 size-4 text-muted-foreground"
                          icon={Tick02Icon}
                        />
                      ) : null}
                    </button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ) : (
              <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                No organizations found
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
