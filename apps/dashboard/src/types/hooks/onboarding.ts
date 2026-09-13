export interface OnboardingStatus {
  hasBrandIdentity: boolean;
  hasIntegration: boolean;
  hasSchedule: boolean;
  hasGeoTracking: boolean;
  onboardingCompleted: boolean;
  onboardingDismissed: boolean;
}

export interface UseOnboardingStatusOptions {
  refetchInterval?: number | false;
}

export interface UseOnboardingSuggestionsOptions {
  agentRunning?: boolean;
}

export interface OnboardingRunSnapshot {
  organizationId: string;
  running: boolean;
}

export interface OnboardingAgentStateSource {
  ran: boolean;
  startedAt: Date | null;
}

export interface OnboardingAgentRunState extends OnboardingAgentStateSource {
  running: boolean;
}

export interface InitialOnboardingAgentRun {
  organizationId: string;
  state: OnboardingAgentRunState;
}

export interface PendingOnboardingSuggestion {
  organizationId: string;
  suggestionId: string;
}
