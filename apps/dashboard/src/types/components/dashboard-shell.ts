import type { CSSProperties, ReactNode } from "react";

import type { InitialOnboardingAgentRun } from "@/types/hooks/onboarding";

export interface DashboardShellProps {
  children: ReactNode;
  initialOnboardingAgentRun: InitialOnboardingAgentRun;
  initialSidebarOpen: boolean;
  initialSidebarWidth: number;
}

export interface DashboardOnboardingBannerProps {
  available: boolean;
  dismissing: boolean;
  onDismiss: () => void;
  onExitComplete: () => void;
  onStart: () => void;
  running: boolean;
  starting: boolean;
  visible: boolean;
}

export interface DashboardShellStyle extends CSSProperties {
  "--eve-banner-height": string;
}

export interface DashboardSidebarStyle extends CSSProperties {
  "--sidebar-width": string;
}
