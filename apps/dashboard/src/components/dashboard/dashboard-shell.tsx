"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { SidebarInset, SidebarProvider } from "@notra/ui/components/ui/sidebar";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { cn } from "@notra/ui/lib/utils";
import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { SubscriptionGate } from "@/components/billing/subscription-gate";
import { DashboardSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/header";
import { RestoreSidebarHome } from "@/components/dashboard/restore-sidebar-home";
import { RightPanel } from "@/components/dashboard/right-panel";
import { useRightPanel } from "@/components/dashboard/right-panel-context";
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

function subscribeToDesktopBreakpoint(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(min-width: 64rem)");
  mediaQuery.addEventListener("change", onStoreChange);

  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

const getDesktopBreakpointSnapshot = () =>
  window.matchMedia("(min-width: 64rem)").matches;
const getServerDesktopBreakpointSnapshot = () => false;

function DashboardAgentPanelSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <Skeleton className="h-8 w-32" />
      <div className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-16 w-4/5" />
        <Skeleton className="h-16 w-3/5 self-end" />
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function DashboardAgentHostLoading() {
  const { active, closePanel, expanded } = useRightPanel();
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopBreakpoint,
    getDesktopBreakpointSnapshot,
    getServerDesktopBreakpointSnapshot
  );

  if (isDesktop) {
    return (
      <RightPanel id="agent">
        <DashboardAgentPanelSkeleton />
      </RightPanel>
    );
  }

  return (
    <ResponsiveDialog
      onOpenChange={(open) => {
        if (!open) {
          closePanel("agent");
        }
      }}
      open={active === "agent"}
    >
      <ResponsiveDialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          expanded
            ? "h-svh max-h-svh max-w-none rounded-none sm:max-w-none"
            : "h-[85svh] max-h-[85svh] sm:max-w-md"
        )}
        drawerClassName={cn(
          "[&>*:not([data-slot=sheet-header]):not([data-slot=sheet-footer]):not([data-slot=sheet-close])]:px-0",
          expanded && "h-svh max-h-svh rounded-none"
        )}
        showCloseButton={false}
      >
        <ResponsiveDialogHeader className="sr-only">
          <ResponsiveDialogTitle>Loading agent</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Loading the dashboard agent.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <DashboardAgentPanelSkeleton />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

const DashboardAgentHost = dynamic(
  () =>
    import("@/components/dashboard/dashboard-agent-panel").then(
      (module) => module.DashboardAgentHost
    ),
  {
    loading: DashboardAgentHostLoading,
    ssr: false,
  }
);

export function DashboardShell({
  children,
  initialSidebarOpen,
  initialSidebarWidth,
}: DashboardShellProps) {
  const { activeOrganization } = useOrganizationsContext();
  const { expanded } = useRightPanel();
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
        <SidebarInset
          className={cn(
            "min-h-0 min-w-0 overflow-hidden",
            expanded && "hidden"
          )}
        >
          <SiteHeader />
          <RestoreSidebarHome />
          <div className="scrollbar-stable @container/main flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain">
            <SubscriptionGate>{children}</SubscriptionGate>
          </div>
        </SidebarInset>
        <div className="contents" id={RIGHT_PANEL_PORTAL_ID} />
        <DashboardAgentHost />
      </SidebarProvider>
    </div>
  );
}
