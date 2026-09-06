"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
} from "@notra/ui/components/ui/sidebar";
import { cn } from "@notra/ui/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import type { DashboardSidebarProps } from "@/types/components/sidebar-resize-handle";

import { ChatHistoryNav } from "./chat-history-nav";
import { NavBrandIdentity } from "./nav-brand-identity";
import { NavMain } from "./nav-main";
import { NavSettings } from "./nav-settings";
import { NavUtility } from "./nav-utility";
import { OrgSelector } from "./org-selector";
import { SidebarLabel } from "./sidebar-label";
import { SidebarOnboarding } from "./sidebar-onboarding";
import { SidebarProjectSwitcher } from "./sidebar-project-switcher";
import { SidebarResizeHandle } from "./sidebar-resize-handle";
import { SidebarSwap } from "./sidebar-swap";
import { SidebarTrialExpired } from "./sidebar-trial-expired";
import { SidebarUpgrade } from "./sidebar-upgrade";

function SidebarBackButton({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-sidebar sticky top-0 z-10 p-2">
      <SidebarMenu>
        <SidebarMenuButton
          className="hover:bg-sidebar-accent duration-normal cursor-pointer transition-colors [&>*]:group-data-[collapsible=icon]:-translate-x-px"
          onClick={onBack}
          tooltip="Back"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} />
          <SidebarLabel>Back</SidebarLabel>
        </SidebarMenuButton>
      </SidebarMenu>
    </div>
  );
}

export function DashboardSidebar({
  className,
  onWidthChange,
  onWidthChangeEnd,
  onWidthChangeStart,
  resizing,
  width,
  ...props
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile, setOpenMobile } = useSidebar();
  const { activeOrganization } = useOrganizationsContext();
  const navigationKey = `${pathname}?${searchParams.toString()}`;
  const pathnameSegments = pathname.split("/").filter(Boolean);
  const slug = pathnameSegments[0] ?? activeOrganization?.slug ?? "";

  const section = pathnameSegments[1];
  const panelId =
    section === "settings" || section === "chat" || section === "brand"
      ? section
      : "main";
  const isSubpage = panelId !== "main";

  const hasVisitedMainRef = useRef(false);
  const previousNavigationKeyRef = useRef(navigationKey);
  useEffect(() => {
    if (!isSubpage) {
      hasVisitedMainRef.current = true;
    }
  }, [isSubpage]);

  useEffect(() => {
    if (previousNavigationKeyRef.current !== navigationKey && isMobile) {
      setOpenMobile(false);
    }
    previousNavigationKeyRef.current = navigationKey;
  }, [isMobile, navigationKey, setOpenMobile]);

  function handleBack() {
    if (hasVisitedMainRef.current) {
      router.back();
      return;
    }
    router.push(`/${slug}`);
  }

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className={cn(
        "overflow-hidden overscroll-none border-none",
        resizing && "transition-none!",
        className
      )}
    >
      <SidebarHeader>
        <SidebarProjectSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarSwap
          activeId={panelId}
          className="overflow-x-clip"
          items={[
            {
              id: "main",
              side: "left",
              children: <NavMain />,
            },
            {
              id: "chat",
              side: "right",
              children: (
                <>
                  <SidebarBackButton onBack={handleBack} />
                  <ChatHistoryNav />
                </>
              ),
            },
            {
              id: "settings",
              side: "right",
              children: (
                <>
                  <SidebarBackButton onBack={handleBack} />
                  <NavSettings slug={slug} />
                </>
              ),
            },
            {
              id: "brand",
              side: "right",
              children: (
                <>
                  <SidebarBackButton onBack={handleBack} />
                  <NavBrandIdentity slug={slug} />
                </>
              ),
            },
          ]}
        />
        <div className="mt-auto">
          <NavUtility slug={slug} />
          <SidebarTrialExpired />
          <SidebarOnboarding />
          <SidebarUpgrade />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <OrgSelector />
      </SidebarFooter>
      <SidebarRail />
      <SidebarResizeHandle
        onWidthChange={onWidthChange}
        onWidthChangeEnd={onWidthChangeEnd}
        onWidthChangeStart={onWidthChangeStart}
        width={width}
      />
    </Sidebar>
  );
}
