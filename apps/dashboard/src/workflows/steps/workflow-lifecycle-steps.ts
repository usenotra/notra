import { POSTHOG_EVENTS } from "@notra/posthog/events";

import { trackServerEventAndFlush } from "@/lib/analytics/posthog-server";
import { trackWorkflowOutcomeAndFlush } from "@/lib/analytics/workflow-lifecycle";
import type {
  OnboardingAgentStartedInput,
  WorkflowOutcomeInput,
} from "@/types/analytics/workflow-events";
import { registerWorkflowRuntime } from "@/workflows/runtime";

export async function trackWorkflowOutcome(
  input: WorkflowOutcomeInput
): Promise<void> {
  "use step";
  await registerWorkflowRuntime();
  await trackWorkflowOutcomeAndFlush(input);
}

export async function trackOnboardingAgentStarted(
  input: OnboardingAgentStartedInput
): Promise<void> {
  "use step";
  await registerWorkflowRuntime();
  await trackServerEventAndFlush({
    event: POSTHOG_EVENTS.ONBOARDING_AGENT_STARTED,
    organizationId: input.organizationId,
    properties: { run_id: input.runId },
  });
}
