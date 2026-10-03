import {
  getOnboardingAgentState,
  releaseOnboardingAgentReservation,
  sendOnboardingSlackInvite,
  startOnboardingAgentSession,
} from "@/lib/onboarding-agent";

export async function sendOnboardingSlackInviteStep(input: {
  email: string;
  organizationName: string;
}): Promise<{ invited: boolean }> {
  "use step";
  return await sendOnboardingSlackInvite(input);
}

export async function startOnboardingAgentSessionStep(input: {
  domain: string;
  organizationId: string;
  reservedAt: string;
}): Promise<{ sessionId: string }> {
  "use step";
  return await startOnboardingAgentSession(input);
}

export async function getOnboardingAgentStateStep(input: {
  organizationId: string;
  poll: number;
  softLimitPolls: number;
}): Promise<{ ran: boolean }> {
  "use step";
  const state = await getOnboardingAgentState(input.organizationId);
  if (!state.ran && input.poll === input.softLimitPolls) {
    console.error(
      `[Onboarding Agent] Run for organization ${input.organizationId} exceeded the soft time limit`
    );
  }
  return state;
}

export async function releaseOnboardingAgentReservationStep(input: {
  organizationId: string;
  reservedAt: string;
}): Promise<void> {
  "use step";
  await releaseOnboardingAgentReservation(
    input.organizationId,
    new Date(input.reservedAt)
  );
}

Object.assign(startOnboardingAgentSessionStep, { maxRetries: 0 });
