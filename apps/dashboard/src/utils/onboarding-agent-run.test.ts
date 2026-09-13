import { expect, test } from "bun:test";

import { AGENT_RUN_HARD_LIMIT_MS } from "@/constants/onboarding-agent";

import { resolveOnboardingAgentRunState } from "./onboarding-agent-run";

const NOW = Date.UTC(2026, 8, 13, 12);

test("keeps an unfinished recent onboarding run active", () => {
  const startedAt = new Date(NOW - AGENT_RUN_HARD_LIMIT_MS + 1);

  expect(
    resolveOnboardingAgentRunState({ ran: false, startedAt }, NOW)
  ).toEqual({ ran: false, running: true, startedAt });
});

test("expires an unfinished onboarding run at the hard limit", () => {
  const startedAt = new Date(NOW - AGENT_RUN_HARD_LIMIT_MS);

  expect(
    resolveOnboardingAgentRunState({ ran: false, startedAt }, NOW)
  ).toEqual({ ran: false, running: false, startedAt });
});

test("does not report completed onboarding as running", () => {
  const startedAt = new Date(NOW - 1);

  expect(resolveOnboardingAgentRunState({ ran: true, startedAt }, NOW)).toEqual(
    { ran: true, running: false, startedAt }
  );
});
