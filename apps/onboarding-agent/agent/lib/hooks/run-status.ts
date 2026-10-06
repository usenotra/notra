import { logError } from "@notra/ai/utils/server-log";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { captureServerEvent, flushPostHogServer } from "@notra/posthog/server";
import { getOrganizationId } from "@notra/tools/utils/organization";
import type { SessionContext } from "eve/context";
import { defineHook, type HookDefinition } from "eve/hooks";

import { markOnboardingAgentRan } from "../utils/run-status";

async function trackRunOutcome(
  ctx: SessionContext,
  outcome: "completed" | "failed",
  properties: { stage: string; error_code?: string }
): Promise<void> {
  try {
    captureServerEvent({
      event:
        outcome === "completed"
          ? POSTHOG_EVENTS.ONBOARDING_AGENT_COMPLETED
          : POSTHOG_EVENTS.ONBOARDING_AGENT_FAILED,
      organizationId: getOrganizationId(ctx),
      properties: { ...properties, session_id: ctx.session.id },
    });
    await flushPostHogServer();
  } catch (error) {
    console.error("[run-status] PostHog capture failed", error);
  }
}

export function createRunStatusHook(): HookDefinition {
  return defineHook({
    events: {
      async "turn.completed"(_event, ctx) {
        await markOnboardingAgentRan(ctx);
      },
      async "session.completed"(_event, ctx) {
        await markOnboardingAgentRan(ctx);
        await trackRunOutcome(ctx, "completed", { stage: "session" });
      },
      async "turn.failed"(event, ctx) {
        logError("[run-status] Onboarding agent turn failed", undefined, {
          sessionId: ctx.session.id,
          errorMessage: event.data.message,
          errorCode: event.data.code,
        });
        await trackRunOutcome(ctx, "failed", {
          stage: "turn",
          error_code: event.data.code,
        });
      },
      async "session.failed"(event, ctx) {
        logError("[run-status] Onboarding agent session failed", undefined, {
          sessionId: ctx.session.id,
          errorMessage: event.data.message,
          errorCode: event.data.code,
        });
        await trackRunOutcome(ctx, "failed", {
          stage: "session",
          error_code: event.data.code,
        });
      },
    },
  });
}
