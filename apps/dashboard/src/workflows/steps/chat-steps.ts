import { calculateAiCreditCostCents } from "@notra/ai/billing/ai-credit-cost";
import {
  allowUnmeteredAiInDevelopment,
  autumn,
} from "@notra/ai/billing/autumn";
import { checkChatBilling } from "@notra/ai/billing/chat-billing";
import { FEATURES } from "@notra/ai/billing/features";
import { startChatAbortPolling } from "@notra/ai/chat/abort-polling";
import {
  claimChatWorkflowRequest,
  clearActiveChatStream,
  clearChatAbortFlag,
  getChatProjectId,
  getChatStreamChannelName,
  loadChatHistory,
  replaceChatHistory,
} from "@notra/ai/chat/history";
import {
  getGitHubIntegrationById,
  getGitHubIntegrationsByOrganization,
  getGitHubToolRepositoryContextByIntegrationId,
} from "@notra/ai/integrations/github";
import {
  getLinearIntegrationById,
  getLinearIntegrationsByOrganization,
  getLinearToolContextByIntegrationId,
} from "@notra/ai/integrations/linear";
import { orchestrateStandaloneChat } from "@notra/ai/orchestration/orchestrate-standalone";
import { realtime } from "@notra/ai/realtime";
import type { ChatUsageSnapshot } from "@notra/ai/types/chat";
import type { StandaloneChatContextItem } from "@notra/ai/types/standalone-chat";
import { buildChatFinishMetadata } from "@notra/ai/utils/chat";
import { routeUsageProperties } from "@notra/ai/utils/route-usage";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { flushPostHogServer } from "@notra/posthog/server";
import type { UIMessageChunk } from "ai";
import { nanoid } from "nanoid";

import { AI_CREDITS_SOURCE_STANDALONE_CHAT } from "@/constants/studio-analytics";
import { WORKFLOW_ANALYTICS_NAMES } from "@/constants/workflow-analytics";
import { trackServerEventAndFlush } from "@/lib/analytics/posthog-server";
import { buildStandaloneChatTelemetryMetadata } from "@/lib/tcc";
import { reportStepError } from "@/lib/workflows/step-errors";
import type {
  ChatBillingRecheckInput,
  ChatBillingRecheckResult,
  RejectChatGenerationInput,
  ResolveChatStreamInput,
  ResolveChatStreamResult,
  StandaloneChatWorkflowResult,
  StreamChatResponseInput,
} from "@/types/workflows/chat";

const LOG_PREFIX = "[Chat Workflow]";

export async function claimChatWorkflowRequestStep(
  requestId: string
): Promise<boolean> {
  "use step";
  return await claimChatWorkflowRequest(requestId);
}

export async function resolveChatStreamStep(
  input: ResolveChatStreamInput
): Promise<ResolveChatStreamResult> {
  "use step";
  const messages = await loadChatHistory(input.organizationId, input.chatId);
  const latestMessage = messages.at(-1);
  if (!latestMessage) {
    return { status: "empty_history" };
  }
  if (!latestMessage.id) {
    return { status: "missing_message_id" };
  }
  return { status: "ready", streamId: latestMessage.id };
}

export async function recheckChatBillingStep(
  input: ChatBillingRecheckInput
): Promise<ChatBillingRecheckResult> {
  "use step";
  if (!autumn || allowUnmeteredAiInDevelopment) {
    return { allowed: true, unavailable: false, chargeAiCredits: false };
  }

  try {
    const billing = await checkChatBilling(input.organizationId);
    return {
      allowed: billing.allowed,
      unavailable: false,
      chargeAiCredits: billing.chargeAiCredits,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} AI credit check failed`, {
      requestId: input.requestId,
      organizationId: input.organizationId,
      chatId: input.chatId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { allowed: false, unavailable: true, chargeAiCredits: false };
  }
}

export async function rejectChatGenerationStep(
  input: RejectChatGenerationInput
): Promise<void> {
  "use step";
  const { requestId, organizationId, chatId, streamId, unavailable } = input;
  console.warn(`${LOG_PREFIX} AI credit check rejected generation`, {
    requestId,
    organizationId,
    chatId,
    unavailable,
  });

  const channel = realtime?.channel(
    getChatStreamChannelName(organizationId, chatId, streamId)
  );

  try {
    if (channel) {
      await channel.emit("ai.chunk", {
        type: "error",
        errorText: unavailable
          ? "Unable to verify usage limits. Please try again."
          : "Usage limit reached.",
      });
      await channel.emit("ai.chunk", {
        type: "finish",
        finishReason: "error",
      });
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to emit billing error`, {
      requestId,
      organizationId,
      chatId,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await clearActiveChatStream(organizationId, chatId, streamId);
  }
}

export async function streamChatResponseStep(
  input: StreamChatResponseInput
): Promise<StandaloneChatWorkflowResult> {
  "use step";
  const {
    requestId,
    organizationId,
    chatId,
    userId,
    context: standaloneContext,
    useMarkup,
    model,
    enableThinking,
    thinkingLevel,
    timezone,
    streamId,
    chargeAiCredits,
  } = input;

  const messages = await loadChatHistory(organizationId, chatId);
  if (messages.length === 0) {
    await clearActiveChatStream(organizationId, chatId, streamId);
    return { status: "empty_history" };
  }

  const projectId = await getChatProjectId(organizationId, chatId);

  const channelName = getChatStreamChannelName(
    organizationId,
    chatId,
    streamId
  );
  const channel = realtime?.channel(channelName);

  if (!channel) {
    console.error(`${LOG_PREFIX} Realtime not configured for streaming`, {
      requestId,
      organizationId,
      chatId,
      channelName,
    });
    await clearActiveChatStream(organizationId, chatId, streamId);
    return { status: "realtime_unavailable" };
  }

  const abortController = new AbortController();
  let stopAbortPolling: (() => void) | null = null;
  const streamStartedAt = Date.now();
  const timing: { firstChunkAt: number | null } = { firstChunkAt: null };
  const usageSnapshot: ChatUsageSnapshot = {};

  let buffer: UIMessageChunk[] = [];
  let flushPromise: Promise<void> | null = null;

  const flushBuffer = async () => {
    while (buffer.length > 0) {
      const batch = buffer;
      buffer = [];
      await channel.emit("ai.chunk", batch as never);
    }
  };

  const scheduleFlush = () => {
    if (flushPromise) {
      return;
    }
    flushPromise = flushBuffer().finally(() => {
      flushPromise = null;
    });
  };

  const drainPendingFlushes = async () => {
    if (flushPromise) {
      await flushPromise;
    }
    await flushBuffer();
  };

  try {
    stopAbortPolling = startChatAbortPolling({
      organizationId,
      chatId,
      streamId,
      onAbort: () => abortController.abort(),
    });
    const { stream, routingDecision } = await orchestrateStandaloneChat(
      {
        organizationId,
        chatId,
        userId,
        messages,
        context: standaloneContext as StandaloneChatContextItem[],
        maxSteps: 50,
        abortSignal: abortController.signal,
        requestedModel: model,
        enableThinking,
        thinkingLevel,
        timezone,
        useMarkup,
        projectId,
        telemetryMetadata: buildStandaloneChatTelemetryMetadata({
          chatId,
          organizationId,
          routeName: "workflows/standalone-chat",
          userId,
        }),
      },
      {
        integrationFetchers: {
          getGitHubIntegrationById,
          getLinearIntegrationById,
          listGitHubIntegrationsByOrganization:
            getGitHubIntegrationsByOrganization,
          listLinearIntegrationsByOrganization:
            getLinearIntegrationsByOrganization,
        },
        resolveContext: getGitHubToolRepositoryContextByIntegrationId,
        resolveLinearContext: getLinearToolContextByIntegrationId,
        onFirstChunk() {
          if (timing.firstChunkAt === null) {
            timing.firstChunkAt = Date.now();
          }
        },
        async onUsage(usage, modelId, routeUsage) {
          usageSnapshot.inputTokens = usage.inputTokens ?? 0;
          usageSnapshot.outputTokens = usage.outputTokens ?? 0;
          usageSnapshot.totalTokens = usage.totalTokens ?? 0;
          usageSnapshot.cacheReadTokens =
            usage.inputTokenDetails?.cacheReadTokens ?? 0;
          usageSnapshot.cacheWriteTokens =
            usage.inputTokenDetails?.cacheWriteTokens ?? 0;

          if (!autumn || allowUnmeteredAiInDevelopment || !chargeAiCredits) {
            return;
          }

          const cost = calculateAiCreditCostCents(
            {
              inputTokens: usage.inputTokens ?? 0,
              outputTokens: usage.outputTokens ?? 0,
              totalTokens: usage.totalTokens ?? 0,
              cacheReadTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
              cacheWriteTokens: usage.inputTokenDetails?.cacheWriteTokens ?? 0,
            },
            modelId,
            useMarkup
          );

          try {
            await autumn.track({
              customerId: organizationId,
              featureId: FEATURES.AI_CREDITS,
              value: cost.costCents,
              properties: {
                ...routeUsageProperties(routeUsage),
                source: "standalone_chat",
                model: modelId,
                billing_basis: cost.billingBasis,
                input_tokens: usage.inputTokens ?? 0,
                output_tokens: usage.outputTokens ?? 0,
                cache_read_tokens:
                  usage.inputTokenDetails?.cacheReadTokens ?? 0,
                cache_write_tokens:
                  usage.inputTokenDetails?.cacheWriteTokens ?? 0,
                total_tokens: usage.totalTokens ?? 0,
                cost_cents: cost.costCents,
                token_cost_cents: cost.tokenCostCents,
              },
            });
            await trackServerEventAndFlush({
              event: POSTHOG_EVENTS.AI_CREDITS_CHARGED,
              userId,
              organizationId,
              properties: {
                cost_cents: cost.costCents,
                source: AI_CREDITS_SOURCE_STANDALONE_CHAT,
                model: modelId,
                billing_basis: cost.billingBasis,
                tokens: usage.totalTokens ?? 0,
                chat_id: chatId,
              },
            });
          } catch (trackError) {
            console.error("[Autumn] Track error after standalone chat:", {
              requestId,
              customerId: organizationId,
              error: trackError,
            });
          }
        },
      }
    );

    console.log(`${LOG_PREFIX} Routing decision:`, {
      requestId,
      chatId,
      decision: routingDecision,
    });

    const uiStream = stream.toUIMessageStream({
      originalMessages: messages,
      generateMessageId: nanoid,
      sendReasoning: enableThinking !== false,
      messageMetadata: ({ part }) => {
        const effectiveThinkingLevel =
          enableThinking === false
            ? "off"
            : (routingDecision.thinkingLevel ?? thinkingLevel);

        if (part.type === "start") {
          return {
            authorUserId: userId,
            model: routingDecision.model,
            requestedModel: model ?? "auto",
            thinkingLevel: effectiveThinkingLevel,
            requestedThinkingLevel: thinkingLevel,
            createdAt: streamStartedAt,
          };
        }

        if (part.type === "finish") {
          return buildChatFinishMetadata({
            streamStartedAt,
            firstChunkAt: timing.firstChunkAt,
            finishedAt: Date.now(),
            partUsage: part.totalUsage,
            usageSnapshot,
            model: routingDecision.model,
            requestedModel: model ?? "auto",
            thinkingLevel: effectiveThinkingLevel,
            requestedThinkingLevel: thinkingLevel,
          });
        }

        return;
      },
      onFinish: async ({ messages: responseMessages }) => {
        try {
          const saved = await replaceChatHistory(
            organizationId,
            chatId,
            responseMessages,
            undefined,
            streamId
          );
          if (!saved) {
            console.warn(
              `${LOG_PREFIX} Skipped saving response: chat was deleted`,
              { requestId, organizationId, chatId }
            );
          }
        } finally {
          await clearActiveChatStream(organizationId, chatId, streamId);
        }
      },
      onError: (error) => {
        console.error(`${LOG_PREFIX} Stream error:`, { requestId, error });
        return "An error occurred while processing your request.";
      },
    });

    for await (const chunk of uiStream) {
      if (abortController.signal.aborted) {
        break;
      }
      buffer.push(chunk as UIMessageChunk);
      scheduleFlush();
    }

    if (abortController.signal.aborted) {
      buffer.push(
        { type: "abort", reason: "user-stopped" },
        { type: "finish", finishReason: "stop" }
      );
      scheduleFlush();
    }

    await drainPendingFlushes();
    return abortController.signal.aborted
      ? { status: "aborted" }
      : { status: "completed" };
  } catch (error) {
    const isAbort =
      abortController.signal.aborted ||
      (error instanceof Error && error.name === "AbortError");

    await drainPendingFlushes();

    if (isAbort) {
      console.log(`${LOG_PREFIX} Aborted by user:`, { requestId, chatId });
      await channel.emit("ai.chunk", {
        type: "abort",
        reason: "user-stopped",
      });
      await channel.emit("ai.chunk", {
        type: "finish",
        finishReason: "stop",
      });
    } else {
      console.error(`${LOG_PREFIX} Error:`, {
        requestId,
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      await reportStepError(error, {
        workflow: WORKFLOW_ANALYTICS_NAMES.CHAT,
        step: "streamChatResponse",
        organizationId,
      });
      await channel.emit("ai.chunk", {
        type: "error",
        errorText: "An error occurred while processing your request.",
      });
      await channel.emit("ai.chunk", {
        type: "finish",
        finishReason: "error",
      });
    }

    await clearActiveChatStream(organizationId, chatId, streamId);
    return isAbort ? { status: "aborted" } : { status: "failed" };
  } finally {
    stopAbortPolling?.();
    await clearChatAbortFlag(organizationId, chatId, streamId).catch(
      () => undefined
    );
    await flushPostHogServer();
  }
}

Object.assign(streamChatResponseStep, { maxRetries: 0 });
