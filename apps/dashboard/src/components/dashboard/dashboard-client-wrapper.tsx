"use client";

import { DbClient, DbProvider } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { Suspense, useState } from "react";

import { CommandPalette } from "@/components/command-palette/command-palette";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette-context";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FeedbackProvider } from "@/components/dashboard/feedback-context";
import { DatabuddyFlagsProvider } from "@/components/providers/databuddy-flags-provider";
import {
  type InitialActiveOrganization,
  OrganizationsProvider,
} from "@/components/providers/organization-provider";
import { SettingsModal } from "@/components/settings/settings-modal";

interface DashboardClientWrapperProps {
  children: React.ReactNode;
  initialActiveOrganization?: InitialActiveOrganization | null;
  initialSidebarOpen?: boolean;
  initialSidebarWidth: number;
  modal?: React.ReactNode;
}

export function DashboardClientWrapper({
  children,
  initialActiveOrganization,
  initialSidebarOpen = true,
  initialSidebarWidth,
  modal,
}: DashboardClientWrapperProps) {
  const queryClient = useQueryClient();
  // Scoped to the dashboard: the react-db engine has no consumers outside it.
  const [dbClient] = useState(() => new DbClient({ queryClient }));

  return (
    <OrganizationsProvider
      initialActiveOrganization={initialActiveOrganization}
    >
      <DbProvider client={dbClient}>
        <DatabuddyFlagsProvider>
          <FeedbackProvider>
            <CommandPaletteProvider>
              <DashboardShell
                initialSidebarOpen={initialSidebarOpen}
                initialSidebarWidth={initialSidebarWidth}
              >
                {children}
              </DashboardShell>
              <CommandPalette />
              <Suspense fallback={null}>
                <SettingsModal />
              </Suspense>
            </CommandPaletteProvider>
          </FeedbackProvider>
        </DatabuddyFlagsProvider>
      </DbProvider>
      {modal}
    </OrganizationsProvider>
  );
}
