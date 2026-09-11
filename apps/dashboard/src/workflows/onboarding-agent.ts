import type { OnboardingAgentWorkflowPayload } from "@notra/ai/types/onboarding-agent";
import { onboardingAgentWorkflowPayloadSchema } from "@notra/schemas/dashboard/workflows/onboarding-agent-payload";
import { sleep } from "workflow";
import { flattenError } from "zod";

import {
  AGENT_RUN_BACKEND_SLEEP_SECONDS,
  AGENT_RUN_HARD_LIMIT_POLLS,
  AGENT_RUN_SOFT_LIMIT_POLLS,
} from "@/constants/onboarding-agent";
import {
  WORKFLOW_ANALYTICS_NAMES,
  WORKFLOW_OUTCOMES,
  WORKFLOW_UNEXPECTED_FAILURE_REASON,
} from "@/constants/workflow-analytics";
import type { OnboardingAgentWorkflowResult } from "@/types/workflows/onboarding-agent";

import {
  getOnboardingAgentStateStep,
  grantSignupCreditsStep,
  releaseOnboardingAgentReservationStep,
  sendOnboardingSlackInviteStep,
  startOnboardingAgentSessionStep,
} from "./steps/onboarding-agent-steps";
import {
  trackOnboardingAgentStarted,
  trackWorkflowOutcome,
} from "./steps/workflow-lifecycle-steps";

export async function onboardingAgentWorkflow(
  payload: OnboardingAgentWorkflowPayload
): Promise<OnboardingAgentWorkflowResult> {
  "use workflow";

  const parseResult = onboardingAgentWorkflowPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    console.error(
      "[Onboarding Agent] Invalid payload:",
      flattenError(parseResult.error)
    );
    return { status: "invalid_payload" };
  }
  const { organizationId, domain, email, organizationName, reservedAt } =
    parseResult.data;
  const workflowStartedAt = Date.now();

  try {
    await trackOnboardingAgentStarted({ organizationId });

    if (email && organizationName) {
      await sendOnboardingSlackInviteStep({ email, organizationName });
    }

    if (email) {
      await grantSignupCreditsStep({ email, organizationId });
    }

    await startOnboardingAgentSessionStep({
      domain,
      organizationId,
      reservedAt,
    });

    for (let poll = 1; poll <= AGENT_RUN_HARD_LIMIT_POLLS; poll++) {
      await sleep(`${AGENT_RUN_BACKEND_SLEEP_SECONDS}s`);

      const state = await getOnboardingAgentStateStep({
        organizationId,
        poll,
        softLimitPolls: AGENT_RUN_SOFT_LIMIT_POLLS,
      });
      if (state.ran) {
        await trackWorkflowOutcome({
          workflow: WORKFLOW_ANALYTICS_NAMES.ONBOARDING_AGENT,
          outcome: WORKFLOW_OUTCOMES.COMPLETED,
          organizationId,
          startedAt: workflowStartedAt,
          properties: { polls: poll },
        });
        return { status: "completed", polls: poll };
      }
    }

    console.error(
      `[Onboarding Agent] Run for organization ${organizationId} did not finish within the hard time limit`
    );
    await releaseOnboardingAgentReservationStep({
      organizationId,
      reservedAt,
    });
    await trackWorkflowOutcome({
      workflow: WORKFLOW_ANALYTICS_NAMES.ONBOARDING_AGENT,
      outcome: WORKFLOW_OUTCOMES.FAILED,
      organizationId,
      startedAt: workflowStartedAt,
      reason: "timed_out",
    });
    return { status: "timed_out" };
  } catch (error) {
    console.error(
      `[Onboarding Agent] Workflow failed for organization ${organizationId}`
    );
    await releaseOnboardingAgentReservationStep({
      organizationId,
      reservedAt,
    });
    await trackWorkflowOutcome({
      workflow: WORKFLOW_ANALYTICS_NAMES.ONBOARDING_AGENT,
      outcome: WORKFLOW_OUTCOMES.FAILED,
      organizationId,
      startedAt: workflowStartedAt,
      reason: WORKFLOW_UNEXPECTED_FAILURE_REASON,
    });
    throw error;
  }
}
