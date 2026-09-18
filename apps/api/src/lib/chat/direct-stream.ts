import { calculateAiCreditCostCents } from "@notra/ai/billing/ai-credit-cost";
import { autumn } from "@notra/ai/billing/autumn";
import { FEATURES } from "@notra/ai/billing/features";
import { startChatAbortPolling } from "@notra/ai/chat/abort-polling";
import {
  clearActiveChatStream,
  clearChatAbortFlag,
  replaceChatHistory,
} from "@notra/ai/chat/history";
import { getGitHubToolRepositoryContextByIntegrationId } from "@notra/ai/integrations/github";
import { getLinearToolContextByIntegrationId } from "@notra/ai/integrations/linear";
import { orchestrateStandaloneChat } from "@notra/ai/orchestration/orchestrate-standalone";
import type { ChatUsageSnapshot } from "@notra/ai/types/chat";
import { buildChatFinishMetadata } from "@notra/ai/utils/chat";
import { routeUsageProperties } from "@notra/ai/utils/route-usage";
import { toAgentTokenUsage } from "@notra/ai/utils/token-usage";
import { createUIMessageStreamResponse, toUIMessageStream } from "ai";
import { nanoid } from "nanoid";

import type { DirectStandaloneChatArgs } from "../../types/chats";

export async function createDirectStandaloneChatResponse({
  organizationId,
  chatId,
  messages,
  context,
  validatedIntegrations,
  useMarkup,
  chargeAiCredits,
  requestId,
  log,
  model,
  enableThinking,
  thinkingLevel,
  timezone,
  abortSignal,
  externalChannelId,
  telemetryMetadata,
}: DirectStandaloneChatArgs): Promise<Response> {
  const autumnClient = autumn;
  const streamId = messages.at(-1)?.id;

  if (!streamId) {
    throw new Error("Latest message must include an id");
  }

  const redisAbortController = new AbortController();
  const stopAbortPolling = startChatAbortPolling({
    organizationId,
    chatId,
    streamId,
    onAbort: () => redisAbortController.abort(),
  });

  const onRequestAbort = () => redisAbortController.abort();
  abortSignal?.addEventListener("abort", onRequestAbort, { once: true });

  const combinedAbortSignal = abortSignal
    ? AbortSignal.any([abortSignal, redisAbortController.signal])
    : redisAbortController.signal;

  let cleanedUp = false;
  const cleanup = async () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    stopAbortPolling();
    abortSignal?.removeEventListener("abort", onRequestAbort);
    await Promise.allSettled([
      clearChatAbortFlag(organizationId, chatId, streamId),
      clearActiveChatStream(organizationId, chatId, streamId),
    ]);
  };

  const streamStartedAt = Date.now();
  let firstChunkAt: number | null = null;
  const usageSnapshot: ChatUsageSnapshot = {};

  try {
    const { stream, routingDecision } = await orchestrateStandaloneChat(
      {
        organizationId,
        messages: messages as never,
        context,
        maxSteps: 50,
        log,
        requestedModel: model,
        enableThinking,
        thinkingLevel,
        timezone,
        abortSignal: combinedAbortSignal,
        telemetryMetadata,
        useMarkup,
      },
      {
        preValidatedIntegrations: validatedIntegrations,
        resolveContext: getGitHubToolRepositoryContextByIntegrationId,
        resolveLinearContext: getLinearToolContextByIntegrationId,
        onFirstChunk() {
          if (firstChunkAt === null) {
            firstChunkAt = Date.now();
          }
        },
        async onUsage(usage, modelId, routeUsage) {
          usageSnapshot.inputTokens = usage.inputTokens ?? 0;
          usageSnapshot.outputTokens = usage.outputTokens ?? 0;
          usageSnapshot.totalTokens = usage.totalTokens ?? 0;

          if (!(autumnClient && chargeAiCredits)) {
            return;
          }

          const cost = calculateAiCreditCostCents(
            {
              ...toAgentTokenUsage(usage),
              // This usage sums every step, and prices can depend on how big
              // each single request was, so bill the per-step cost.
              maxPromptTokens: routeUsage?.maxPromptTokens,
              tokenCostUsd: routeUsage?.tokenCostUsd,
            },
            modelId,
            useMarkup
          );

          try {
            await autumnClient.track({
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
          } catch (trackError) {
            console.error("[Autumn] Track error after standalone chat:", {
              requestId,
              customerId: organizationId,
              error: trackError,
            });
          }
        },
        log,
      }
    );

    const uiStream = toUIMessageStream({
      stream: stream.stream,
      originalMessages: messages as never,
      generateMessageId: nanoid,
      sendReasoning: enableThinking !== false,
      messageMetadata: ({ part }) => {
        const effectiveThinkingLevel =
          enableThinking === false
            ? "off"
            : (routingDecision.thinkingLevel ?? thinkingLevel);

        if (part.type === "start") {
          return {
            chatId,
            model: routingDecision.model,
            requestedModel: model ?? "auto",
            thinkingLevel: effectiveThinkingLevel,
            requestedThinkingLevel: thinkingLevel,
            createdAt: streamStartedAt,
            ...(externalChannelId ? { externalChannelId } : {}),
          };
        }

        if (part.type === "finish") {
          return buildChatFinishMetadata({
            streamStartedAt,
            firstChunkAt,
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
      onEnd: async ({ messages: responseMessages }) => {
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
              "[Standalone Chat] Skipped saving response: chat was deleted",
              { requestId, organizationId, chatId }
            );
          }
        } finally {
          await cleanup();
        }
      },
      onError: (error) => {
        cleanup().catch(() => undefined);
        console.error("[Standalone Chat] Direct stream error:", {
          requestId,
          error,
        });
        if (
          combinedAbortSignal.aborted ||
          (error instanceof Error && error.name === "AbortError")
        ) {
          return "Generation stopped.";
        }
        return "An error occurred while processing your request.";
      },
    });

    return createUIMessageStreamResponse({
      headers: { "X-Chat-Id": chatId },
      stream: uiStream,
    });
  } catch (error) {
    await cleanup();
    throw error;
  }
}
