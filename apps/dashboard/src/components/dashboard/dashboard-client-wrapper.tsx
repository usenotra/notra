"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { CommandPaletteProvider } from "@/components/command-palette/command-palette-context";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FeedbackProvider } from "@/components/dashboard/feedback-context";
import { RightPanelProvider } from "@/components/dashboard/right-panel-context";
import { DashboardRuntimeProviders } from "@/components/providers/dashboard-runtime-providers";
import { DatabuddyFlagsProvider } from "@/components/providers/databuddy-flags-provider";
import {
  type InitialActiveOrganization,
  OrganizationsProvider,
} from "@/components/providers/organization-provider";
import type { InitialOnboardingAgentRun } from "@/types/hooks/onboarding";

const CommandPalette = dynamic(
  () =>
    import("@/components/command-palette/command-palette").then(
      (module) => module.CommandPalette
    ),
  { ssr: false }
);

const SettingsModal = dynamic(
  () =>
    import("@/components/settings/settings-modal").then(
      (module) => module.SettingsModal
    ),
  { ssr: false }
);

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
                <CommandPalette />
                <Suspense fallback={null}>
                  <SettingsModal />
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
