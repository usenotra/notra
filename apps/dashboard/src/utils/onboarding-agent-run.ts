import { AGENT_RUN_HARD_LIMIT_MS } from "@/constants/onboarding-agent";
import type {
  OnboardingAgentRunState,
  OnboardingAgentStateSource,
} from "@/types/hooks/onboarding";

export function resolveOnboardingAgentRunState(
  state: OnboardingAgentStateSource,
  now = Date.now()
): OnboardingAgentRunState {
  return {
    ...state,
    running:
      !state.ran &&
      state.startedAt !== null &&
      now - state.startedAt.getTime() < AGENT_RUN_HARD_LIMIT_MS,
  };
}
