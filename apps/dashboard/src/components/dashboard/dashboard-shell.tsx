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
import { isDemoModeClient } from "@notra/utils/demo-mode";
import { useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { SubscriptionGate } from "@/components/billing/subscription-gate";
import { DashboardSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/header";
import { RestoreSidebarHome } from "@/components/dashboard/restore-sidebar-home";
import { RightPanel } from "@/components/dashboard/right-panel";
import { useRightPanel } from "@/components/dashboard/right-panel-context";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { EVE_BANNER_HEIGHT } from "@/constants/onboarding-agent";
import { RIGHT_PANEL_PORTAL_ID } from "@/constants/right-panel";
import { useDemoBannerVisible } from "@/lib/hooks/use-demo-banner-visible";
import { useDesktopBreakpoint } from "@/lib/hooks/use-desktop-breakpoint";
import {
  useOnboardingAgentBannerDismissal,
  useOnboardingAgentRun,
  useRunOnboardingAgent,
} from "@/lib/hooks/use-onboarding";
import { useSidebarWidth } from "@/lib/hooks/use-sidebar-width";
import { usePathname } from "@/lib/navigation";
import type {
  DashboardOnboardingBannerProps,
  DashboardShellProps,
  DashboardSidebarStyle,
} from "@/types/components/dashboard-shell";
import { dashboardShellStyle } from "@/utils/dashboard-shell-style";
import dynamic from "@/utils/lazy-component";

// Demo-only UI: loaded on demand so production bundles don't carry it.
const DashboardDemoChrome = dynamic(() =>
  import("@/components/demo/dashboard-demo-chrome").then(
    (module) => module.DashboardDemoChrome
  )
);
const DemoPlaygroundProvider = dynamic(() =>
  import("@/components/demo/demo-playground-provider").then(
    (module) => module.DemoPlaygroundProvider
  )
);

const OnboardingAgentBanner = dynamic(() =>
  import("@/components/dashboard/onboarding-agent-banner").then(
    (module) => module.OnboardingAgentBanner
  )
);

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
  const t = useTranslations("dashboard.agent");
  const { active, closePanel, expanded } = useRightPanel();
  const isDesktop = useDesktopBreakpoint();

  if (isDesktop) {
    return <DashboardAgentPanelSkeleton />;
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
          <ResponsiveDialogTitle>{t("loadingTitle")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("loadingDescription")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <DashboardAgentPanelSkeleton />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function loadDashboardAgentHost() {
  return import("@/components/dashboard/dashboard-agent-panel").then(
    (module) => module.DashboardAgentHost
  );
}

const DashboardAgentHost = dynamic(loadDashboardAgentHost, {
  loading: DashboardAgentHostLoading,
  ssr: false,
});

function DashboardAgentSlot() {
  const { hasOpened } = useRightPanel();
  const [slotReady, setSlotReady] = useState(false);

  useLayoutEffect(() => {
    setSlotReady(true);
  }, []);

  // The slot has to exist before the first open. A panel that mounts already
  // open has no previous width, so the CSS width transition never runs.
  // Keep the host under this slot at every width. Moving it between the dock
  // and the mobile dialog remounts the chat and drops the in-flight thread.
  if (!slotReady) {
    return null;
  }

  return (
    <RightPanel id="agent">
      {hasOpened.agent ? <DashboardAgentHost /> : null}
    </RightPanel>
  );
}

function DashboardOnboardingBanner({
  available,
  dismissing,
  onDismiss,
  onExitComplete,
  onStart,
  running,
  starting,
  visible,
}: DashboardOnboardingBannerProps) {
  if (!(available || dismissing)) {
    return null;
  }

  return (
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
          onExitComplete();
        }
      }}
      style={{ maxHeight: visible ? EVE_BANNER_HEIGHT : "0rem" }}
    >
      <div style={{ height: EVE_BANNER_HEIGHT }}>
        <OnboardingAgentBanner
          onDismiss={onDismiss}
          onStart={onStart}
          starting={starting}
          state={running ? "running" : "idle"}
        />
      </div>
    </div>
  );
}

function DashboardPageViewport({
  children,
}: Pick<DashboardShellProps, "children">) {
  const pathname = usePathname();
  const [, , section, contentId] = pathname.split("/");
  const pageOwnsScroll =
    section === "chat" || (section === "content" && Boolean(contentId));

  return (
    <div
      className={cn(
        "@container/main flex min-h-0 min-w-0 flex-1 flex-col gap-2 overscroll-contain pointer-fine:overscroll-none",
        pageOwnsScroll
          ? "overflow-hidden"
          : "scrollbar-stable scrollbar-thin overflow-x-hidden overflow-y-auto"
      )}
    >
      {children}
    </div>
  );
}

export function DashboardShell({
  children,
  demoBannerHidden,
  initialOnboardingAgentRun,
  initialSidebarOpen,
  initialSidebarWidth,
}: DashboardShellProps) {
  const t = useTranslations("dashboard.onboardingBanner");
  const { activeOrganization } = useOrganizationsContext();
  const { expanded } = useRightPanel();
  const organizationId = activeOrganization?.id ?? "";
  const { data } = useOnboardingAgentRun(
    organizationId,
    initialOnboardingAgentRun
  );
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
  const demo = isDemoModeClient();
  const showDemoBanner = useDemoBannerVisible(demoBannerHidden);
  const shellStyle = dashboardShellStyle(showDemoBanner, visible);
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
        onError: (error) => toast.error(error.message || t("startFailed")),
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

  const shell = (
    <div
      className="bg-sidebar flex h-svh flex-col overflow-hidden overscroll-none"
      data-dashboard-shell
      style={shellStyle}
    >
      {demo ? <DashboardDemoChrome showBanner={showDemoBanner} /> : null}
      <DashboardOnboardingBanner
        available={bannerAvailable}
        dismissing={dismissing}
        onDismiss={handleDismiss}
        onExitComplete={handleBannerExitComplete}
        onStart={handleStart}
        running={running}
        starting={starting}
        visible={visible}
      />
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
          <DashboardPageViewport>
            <SubscriptionGate>{children}</SubscriptionGate>
          </DashboardPageViewport>
        </SidebarInset>
        <div className="contents" id={RIGHT_PANEL_PORTAL_ID} />
        <DashboardAgentSlot />
      </SidebarProvider>
    </div>
  );

  return demo ? (
    <DemoPlaygroundProvider>{shell}</DemoPlaygroundProvider>
  ) : (
    shell
  );
}
