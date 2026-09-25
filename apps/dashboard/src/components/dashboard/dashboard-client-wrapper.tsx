"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@notra/ui/components/ui/dialog";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";

import {
  CommandPaletteProvider,
  useCommandPalette,
} from "@/components/command-palette/command-palette-context";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProductTour } from "@/components/dashboard/product-tour";
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

function CommandPaletteLoading() {
  const { open, setOpen } = useCommandPalette();

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle>Command palette</DialogTitle>
        <p role="status">Loading search…</p>
      </DialogContent>
    </Dialog>
  );
}

function SettingsModalLoading() {
  const { isOpen, closeSettings } = useSettingsModal();

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          closeSettings();
        }
      }}
      open={isOpen}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogTitle>Settings</DialogTitle>
        <p role="status">Loading settings…</p>
      </DialogContent>
    </Dialog>
  );
}

const CommandPalette = dynamic(
  () =>
    import("@/components/command-palette/command-palette").then(
      (module) => module.CommandPalette
    ),
  { loading: CommandPaletteLoading, ssr: false }
);

const SettingsModal = dynamic(
  () =>
    import("@/components/settings/settings-modal").then(
      (module) => module.SettingsModal
    ),
  { loading: SettingsModalLoading, ssr: false }
);

function DashboardOverlays() {
  const { open } = useCommandPalette();
  const { isOpen } = useSettingsModal();
  const [opened, setOpened] = useState({ palette: open, settings: isOpen });

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
  initialActiveOrganization?: InitialActiveOrganization | null;
  initialOnboardingAgentRun: InitialOnboardingAgentRun;
  initialSidebarOpen?: boolean;
  initialSidebarWidth: number;
  modal?: React.ReactNode;
}

export function DashboardClientWrapper({
  children,
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
                  initialOnboardingAgentRun={initialOnboardingAgentRun}
                  initialSidebarOpen={initialSidebarOpen}
                  initialSidebarWidth={initialSidebarWidth}
                >
                  {children}
                </DashboardShell>
                <Suspense fallback={null}>
                  <DashboardOverlays />
                </Suspense>
                <ProductTour />
              </RightPanelProvider>
            </CommandPaletteProvider>
          </FeedbackProvider>
        </DatabuddyFlagsProvider>
        {modal}
      </OrganizationsProvider>
    </DashboardRuntimeProviders>
  );
}
