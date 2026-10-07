import { chatWorkflowPayloadSchema } from "@notra/ai/schemas/chat";
import type { ChatWorkflowPayload } from "@notra/ai/types/chat";
import { flattenError } from "zod";

import {
  WORKFLOW_ANALYTICS_NAMES,
  WORKFLOW_OUTCOMES,
} from "@/constants/workflow-analytics";
import type { StandaloneChatWorkflowResult } from "@/types/workflows/chat";

import {
  claimChatWorkflowRequestStep,
  recheckChatBillingStep,
  rejectChatGenerationStep,
  resolveChatStreamStep,
  streamChatResponseStep,
} from "./steps/chat-steps";
import { trackWorkflowOutcome } from "./steps/workflow-lifecycle-steps";

export async function standaloneChatWorkflow(
  payload: ChatWorkflowPayload
): Promise<StandaloneChatWorkflowResult> {
  "use workflow";

  const parseResult = chatWorkflowPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    console.error(
      "[Chat Workflow] Invalid payload:",
      flattenError(parseResult.error)
    );
    return { status: "invalid_payload" };
  }
  const { requestId, organizationId, chatId } = parseResult.data;
  const workflowStartedAt = Date.now();

  const requestClaimed = await claimChatWorkflowRequestStep(requestId);
  if (!requestClaimed) {
    console.error("[Chat Workflow] Duplicate or unclaimable request", {
      requestId,
      organizationId,
      chatId,
    });
    return { status: "duplicate_request" };
  }

  const stream = await resolveChatStreamStep({
    organizationId,
    chatId,
    streamId: parseResult.data.streamId,
  });
  if (stream.status !== "ready") {
    return { status: stream.status };
  }

  const creditCheck = await recheckChatBillingStep({
    requestId,
    organizationId,
    chatId,
  });
  if (!creditCheck.allowed) {
    await rejectChatGenerationStep({
      requestId,
      organizationId,
      chatId,
      streamId: stream.streamId,
      unavailable: creditCheck.unavailable,
    });
    return { status: "usage_limit_reached" };
  }

  const result = await streamChatResponseStep({
    ...parseResult.data,
    streamId: stream.streamId,
    chargeAiCredits: creditCheck.chargeAiCredits,
  });
  await trackWorkflowOutcome({
    workflow: WORKFLOW_ANALYTICS_NAMES.CHAT,
    outcome:
      result.status === "failed"
        ? WORKFLOW_OUTCOMES.FAILED
        : WORKFLOW_OUTCOMES.COMPLETED,
    organizationId,
    runId: requestId,
    startedAt: workflowStartedAt,
    reason: result.status === "failed" ? result.status : undefined,
    properties: { status: result.status, chat_id: chatId },
  });
  return result;
}
