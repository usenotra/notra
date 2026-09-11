"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { MouseEvent } from "react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@notra/ui/components/ui/sidebar";
import { cn } from "@notra/ui/lib/utils";

import {
  SIDEBAR_MODE_HOME_LINKS,
  SIDEBAR_MODE_PILL_CLASS,
  SIDEBAR_MODES,
} from "@/constants/nav";
import { trackEvent } from "@/lib/analytics/posthog-client";
import type { NavModeSwitchProps, SidebarMode } from "@/types/components/nav";
import { geoNavHref } from "@/utils/geo-paths";

import { SidebarLabel } from "./sidebar-label";
import { SidebarNavLink } from "./sidebar-nav-link";

export function NavModeSwitch({
  mode,
  slug,
  projectId,
  onModeChange,
}: NavModeSwitchProps) {
  const handleModeSelect = (
    next: SidebarMode,
    event: MouseEvent<HTMLAnchorElement>
  ) => {
    event.preventDefault();
    if (next !== mode) {
      trackEvent(POSTHOG_EVENTS.SIDEBAR_MODE_SWITCHED, {
        from: mode,
        to: next,
      });
    }
    onModeChange(next);
  };

  return (
    <SidebarGroup className="pt-0">
      <div className="bg-sidebar-accent rounded-lg p-0.5 group-data-[collapsible=icon]:hidden">
        <div className="relative grid grid-cols-2">
          <div
            aria-hidden
            className={cn(
              SIDEBAR_MODE_PILL_CLASS,
              mode === "studio" && "translate-x-full"
            )}
          />
          {SIDEBAR_MODES.map((option) => {
            const isActive = option.id === mode;
            return (
              <SidebarNavLink
                aria-current={isActive ? "page" : undefined}
                title={`${option.label} · ${option.description}`}
                className={cn(
                  "duration-fast relative z-10 flex h-7 items-center justify-center gap-1.5 rounded-md text-xs transition-colors",
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
                href={geoNavHref(
                  slug,
                  SIDEBAR_MODE_HOME_LINKS[option.id],
                  projectId
                )}
                key={option.id}
                onClick={(event) => handleModeSelect(option.id, event)}
              >
                <HugeiconsIcon className="size-3.5" icon={option.icon} />
                {option.label}
              </SidebarNavLink>
            );
          })}
        </div>
      </div>
      <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
        {SIDEBAR_MODES.map((option) => (
          <SidebarMenuItem key={option.id}>
            <SidebarMenuButton
              isActive={option.id === mode}
              render={
                <SidebarNavLink
                  href={geoNavHref(
                    slug,
                    SIDEBAR_MODE_HOME_LINKS[option.id],
                    projectId
                  )}
                  onClick={(event) => handleModeSelect(option.id, event)}
                >
                  <HugeiconsIcon icon={option.icon} />
                  <SidebarLabel>{option.label}</SidebarLabel>
                </SidebarNavLink>
              }
              tooltip={`${option.label} · ${option.description}`}
            />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
