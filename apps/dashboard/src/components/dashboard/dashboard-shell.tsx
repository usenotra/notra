"use client";

import { SidebarInset, SidebarProvider } from "@notra/ui/components/ui/sidebar";
import { cn } from "@notra/ui/lib/utils";
import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SubscriptionGate } from "@/components/billing/subscription-gate";
import { DashboardSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/header";
import { RestoreSidebarHome } from "@/components/dashboard/restore-sidebar-home";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { EVE_BANNER_HEIGHT } from "@/constants/onboarding-agent";
import { RIGHT_PANEL_PORTAL_ID } from "@/constants/right-panel";
import {
  useOnboardingAgentBannerDismissal,
  useOnboardingAgentRun,
  useRunOnboardingAgent,
} from "@/lib/hooks/use-onboarding";
import { useSidebarWidth } from "@/lib/hooks/use-sidebar-width";
import type {
  DashboardShellProps,
  DashboardSidebarStyle,
  DashboardShellStyle,
} from "@/types/components/dashboard-shell";

const OnboardingAgentBanner = dynamic(() =>
  import("@/components/dashboard/onboarding-agent-banner").then(
    (module) => module.OnboardingAgentBanner
  )
);

export function DashboardShell({
  children,
  initialSidebarOpen,
  initialSidebarWidth,
}: DashboardShellProps) {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";
  const { data } = useOnboardingAgentRun(organizationId);
  const runAgent = useRunOnboardingAgent();
  const { dismiss, dismissed } =
    useOnboardingAgentBannerDismissal(organizationId);
  const running = data?.running ?? false;
  const canStart = !!data && !data.ran && !running && !dismissed;
  const bannerAvailable = running || canStart;
  const [dismissingOrganizationId, setDismissingOrganizationId] = useState<
    string | null
  >(null);
  const dismissing = dismissingOrganizationId === organizationId;
  const visible = bannerAvailable && !dismissing;
  const shouldReduceMotion = useReducedMotion();
  const starting =
    runAgent.isPending && runAgent.variables?.organizationId === organizationId;
  const shellStyle: DashboardShellStyle = {
    "--eve-banner-height": visible ? EVE_BANNER_HEIGHT : "0rem",
  };
  const {
    finishSidebarResize,
    setSidebarWidth,
    sidebarResizing,
    sidebarWidth,
    startSidebarResize,
  } = useSidebarWidth(initialSidebarWidth);

  useEffect(() => {
    setDismissingOrganizationId(null);
  }, [organizationId]);

  const handleStart = () => {
    if (!organizationId || starting) {
      return;
    }
    runAgent.mutate(
      { organizationId },
      {
        onError: (error) =>
          toast.error(
            error.message || "Couldn't start the setup agent. Try again later."
          ),
      }
    );
  };

  const handleBannerExitComplete = () => {
    if (!dismissing) {
      return;
    }

    setDismissingOrganizationId(null);
  };

  const handleDismiss = () => {
    if (shouldReduceMotion) {
      dismiss();
      return;
    }

    setDismissingOrganizationId(organizationId);
    dismiss();
  };

  const sidebarStyle: DashboardSidebarStyle = {
    "--sidebar-width": `${sidebarWidth}px`,
  };

  return (
    <div
      className="bg-sidebar flex h-svh flex-col overflow-hidden overscroll-none"
      style={shellStyle}
    >
      {bannerAvailable || dismissing ? (
        <div
          className={cn(
            "duration-normal w-full shrink-0 overflow-hidden transition-[max-height,opacity] ease-out motion-reduce:transition-none",
            visible ? "opacity-100" : "opacity-0"
          )}
          onTransitionEnd={(event) => {
            if (
              event.target === event.currentTarget &&
              event.propertyName === "max-height"
            ) {
              handleBannerExitComplete();
            }
          }}
          style={{ maxHeight: visible ? EVE_BANNER_HEIGHT : "0rem" }}
        >
          <div style={{ height: EVE_BANNER_HEIGHT }}>
            <OnboardingAgentBanner
              onDismiss={handleDismiss}
              onStart={handleStart}
              starting={starting}
              state={running ? "running" : "idle"}
            />
          </div>
        </div>
      ) : null}
      <SidebarProvider
        className={cn(
          "min-h-0! flex-1 overflow-hidden overscroll-none",
          sidebarResizing &&
            "[&_[data-slot=sidebar-gap]]:transition-none! [&_[data-slot=sidebar-inset]]:transition-none!"
        )}
        defaultOpen={initialSidebarOpen}
        style={sidebarStyle}
      >
        <DashboardSidebar
          className="transition-[left,right,width,top,height] [transition-duration:var(--sidebar-duration),var(--sidebar-duration),var(--sidebar-duration),200ms,200ms] [transition-timing-function:var(--sidebar-ease),var(--sidebar-ease),var(--sidebar-ease),ease-out,ease-out] motion-reduce:transition-none md:top-(--eve-banner-height) md:h-[calc(100svh-var(--eve-banner-height))]"
          onWidthChange={setSidebarWidth}
          onWidthChangeEnd={finishSidebarResize}
          onWidthChangeStart={startSidebarResize}
          resizing={sidebarResizing}
          variant="inset"
          width={sidebarWidth}
        />
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
          <SiteHeader />
          <RestoreSidebarHome />
          <div className="scrollbar-stable @container/main flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain">
            <SubscriptionGate>{children}</SubscriptionGate>
          </div>
        </SidebarInset>
        <div className="contents" id={RIGHT_PANEL_PORTAL_ID} />
      </SidebarProvider>
    </div>
  );
}
