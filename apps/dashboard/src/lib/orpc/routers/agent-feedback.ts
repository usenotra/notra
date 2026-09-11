import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  agentFeedbackItemInputSchema,
  agentFeedbackListInputSchema,
  agentFeedbackOrganizationInputSchema,
  agentFeedbackUpdateStatusInputSchema,
} from "@notra/schemas/dashboard/agent-feedback";
import { Effect } from "effect";

import type { AgentFeedbackRouterError } from "@/lib/agent-feedback/errors";
import { readAgentFeedbackOrganization } from "@/lib/agent-feedback/organization";
import {
  deleteAgentFeedback,
  listAgentFeedback,
  updateAgentFeedbackStatus,
} from "@/lib/agent-feedback/programs";
import { buildAgentFeedbackSetup } from "@/lib/agent-feedback/snippet";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { authorizedProcedure } from "@/lib/orpc/base";
import { runOrpcEffect } from "@/lib/orpc/effect";
import { toAgentFeedbackOrpcError } from "@/lib/orpc/utils/agent-feedback-errors";
import type { AgentFeedbackHandlerOptions } from "@/types/agent-feedback";

function agentFeedbackHandler<
  TInput extends { organizationId: string },
  TOutput,
  TError extends AgentFeedbackRouterError,
>(run: (input: TInput) => Effect.Effect<TOutput, TError>) {
  return async ({
    context,
    input,
  }: AgentFeedbackHandlerOptions<TInput>): Promise<TOutput> => {
    await assertOrganizationAccess({
      headers: context.headers,
      organizationId: input.organizationId,
      user: context.user,
    });

    return await runOrpcEffect(run(input), toAgentFeedbackOrpcError);
  };
}

export const agentFeedbackRouter = {
  list: authorizedProcedure
    .input(agentFeedbackListInputSchema)
    .handler(agentFeedbackHandler((input) => listAgentFeedback(input))),
  updateStatus: authorizedProcedure
    .input(agentFeedbackUpdateStatusInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const item = await runOrpcEffect(
        updateAgentFeedbackStatus(input),
        toAgentFeedbackOrpcError
      );

      trackServerEvent({
        event: POSTHOG_EVENTS.AGENT_FEEDBACK_STATUS_CHANGED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
        properties: {
          feedback_id: item.id,
          status: item.status,
          kind: item.kind,
          sentiment: item.sentiment,
        },
      });

      return item;
    }),
  delete: authorizedProcedure
    .input(agentFeedbackItemInputSchema)
    .handler(agentFeedbackHandler((input) => deleteAgentFeedback(input))),
  setup: authorizedProcedure
    .input(agentFeedbackOrganizationInputSchema)
    .handler(
      agentFeedbackHandler((input) =>
        Effect.map(
          readAgentFeedbackOrganization(input.organizationId),
          buildAgentFeedbackSetup
        )
      )
    ),
};
