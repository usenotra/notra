"use client";

import { Suspense, useEffect, useState } from "react";

import {
  CommandPaletteProvider,
  useCommandPalette,
} from "@/components/command-palette/command-palette-context";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FeedbackProvider } from "@/components/dashboard/feedback-context";
import { RightPanelProvider } from "@/components/dashboard/right-panel-context";
import { DashboardRuntimeProviders } from "@/components/providers/dashboard-runtime-providers";
import { DatabuddyFlagsProvider } from "@/components/providers/databuddy-flags-provider";
import {
  type InitialActiveOrganization,
  OrganizationsProvider,
} from "@/components/providers/organization-provider";
import { useSettingsModal } from "@/lib/hooks/use-settings-modal";
import type { InitialOnboardingAgentRun } from "@/types/hooks/onboarding";
import dynamic from "@/utils/lazy-component";

const loadCommandPalette = () =>
  import("@/components/command-palette/command-palette").then(
    (module) => module.CommandPalette
  );

async function loadSettingsModal() {
  const settingsModule = await import("@/components/settings/settings-modal");
  // Resolve only once the default pane is cached, so opening never shows its skeleton.
  await settingsModule.preloadDefaultSettingsPane().catch(() => undefined);
  return settingsModule.SettingsModal;
}

/** Upper bound for waiting on an idle period before warming the overlays anyway. */
const OVERLAY_PRELOAD_IDLE_TIMEOUT_MS = 3000;
const OVERLAY_PRELOAD_FALLBACK_DELAY_MS = 1500;

// Overlays stay out of the initial bundle, but are fetched once the page is
// idle so the first ⌘K or settings open never shows an interim loading dialog.
const CommandPalette = dynamic(loadCommandPalette, {
  loading: () => null,
  ssr: false,
});

const SettingsModal = dynamic(loadSettingsModal, {
  loading: () => null,
  ssr: false,
});

function preloadOverlays() {
  loadCommandPalette().catch(() => undefined);
  loadSettingsModal().catch(() => undefined);
}

function useOverlayPreload() {
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(preloadOverlays, {
        timeout: OVERLAY_PRELOAD_IDLE_TIMEOUT_MS,
      });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = setTimeout(
      preloadOverlays,
      OVERLAY_PRELOAD_FALLBACK_DELAY_MS
    );
    return () => clearTimeout(handle);
  }, []);
}

function DashboardOverlays() {
  const { open } = useCommandPalette();
  const { isOpen } = useSettingsModal();
  const [opened, setOpened] = useState({ palette: open, settings: isOpen });
  useOverlayPreload();

  if ((open && !opened.palette) || (isOpen && !opened.settings)) {
    setOpened({
      palette: opened.palette || open,
      settings: opened.settings || isOpen,
    });
  }

  return (
    <>
      {open || opened.palette ? <CommandPalette /> : null}
      {isOpen || opened.settings ? <SettingsModal /> : null}
    </>
  );
}

interface DashboardClientWrapperProps {
  children: React.ReactNode;
  /** The visitor opened the demo with `?banner=off`. */
  demoBannerHidden?: boolean;
  initialActiveOrganization?: InitialActiveOrganization | null;
  initialOnboardingAgentRun: InitialOnboardingAgentRun;
  initialSidebarOpen?: boolean;
  initialSidebarWidth: number;
  modal?: React.ReactNode;
}

export function DashboardClientWrapper({
  children,
  demoBannerHidden = false,
  initialActiveOrganization,
  initialOnboardingAgentRun,
  initialSidebarOpen = true,
  initialSidebarWidth,
  modal,
}: DashboardClientWrapperProps) {
  return (
    <DashboardRuntimeProviders>
      <OrganizationsProvider
        initialActiveOrganization={initialActiveOrganization}
      >
        <DatabuddyFlagsProvider>
          <FeedbackProvider>
            <CommandPaletteProvider>
              <RightPanelProvider>
                <DashboardShell
                  demoBannerHidden={demoBannerHidden}
                  initialOnboardingAgentRun={initialOnboardingAgentRun}
                  initialSidebarOpen={initialSidebarOpen}
                  initialSidebarWidth={initialSidebarWidth}
                >
                  {children}
                </DashboardShell>
                <Suspense fallback={null}>
                  <DashboardOverlays />
                </Suspense>
              </RightPanelProvider>
            </CommandPaletteProvider>
          </FeedbackProvider>
        </DatabuddyFlagsProvider>
        {modal}
      </OrganizationsProvider>
    </DashboardRuntimeProviders>
  );
}
