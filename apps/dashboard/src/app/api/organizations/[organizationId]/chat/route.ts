import { calculateAiCreditCostCents } from "@notra/ai/billing/ai-credit-cost";
import {
  allowUnmeteredAiInDevelopment,
  autumn,
} from "@notra/ai/billing/autumn";
import { checkChatBilling } from "@notra/ai/billing/chat-billing";
import { FEATURES } from "@notra/ai/billing/features";
import { getChatRedis } from "@notra/ai/chat/config";
import {
  clearActiveChatStream,
  clearLastResponseStopped,
  generateAndSetChatTitle,
  generateChatId,
  getChatSessionState,
  replaceChatHistory,
  setActiveChatStream,
} from "@notra/ai/chat/history";
import { getStandaloneChatIntegrations } from "@notra/ai/chat/integrations-cache";
import { hydrateSavedChatPosts } from "@notra/ai/chat/posts";
import { createChatStreamLifecycle } from "@notra/ai/chat/stream-lifecycle";
import { useLogger as getLogger, withEvlog } from "@notra/ai/evlog";
import { getGitHubToolRepositoryContextByIntegrationId } from "@notra/ai/integrations/github";
import { getGranolaToolContextByIntegrationId } from "@notra/ai/integrations/granola";
import { getLinearToolContextByIntegrationId } from "@notra/ai/integrations/linear";
import { orchestrateStandaloneChat } from "@notra/ai/orchestration/orchestrate-standalone";
import { realtime } from "@notra/ai/realtime";
import { standaloneChatRequestSchema } from "@notra/ai/schemas/chat";
import type { StandaloneChatContextItem } from "@notra/ai/schemas/standalone-chat";
import type {
  ChatUsageSnapshot,
  ChatWorkflowPayload,
} from "@notra/ai/types/chat";
import type { ValidatedIntegration } from "@notra/ai/types/orchestration";
import type { TccMetadata } from "@notra/ai/types/tcc";
import {
  buildChatFinishMetadata,
  stampUserMessageAuthors,
} from "@notra/ai/utils/chat";
import { createChatActivityTimingTracker } from "@notra/ai/utils/chat-activity-timing";
import { preserveConversationSelection } from "@notra/ai/utils/resolve-conversation-route";
import { routeUsageProperties } from "@notra/ai/utils/route-usage";
import { toAgentTokenUsage } from "@notra/ai/utils/token-usage";
import { withChatStreamCleanup } from "@notra/ai/utils/with-chat-stream-cleanup";
import { isProjectInOrganization } from "@notra/db/utils/projects";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  createUIMessageStreamResponse,
  InvalidToolInputError,
  NoSuchToolError,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { after, NextResponse } from "next/server";

import {
  AI_CREDITS_SOURCE_STANDALONE_CHAT,
  CHAT_MODEL_AUTO,
} from "@/constants/studio-analytics";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import {
  countMessageFileParts,
  getChatContextKinds,
} from "@/lib/analytics/studio-events";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { buildStandaloneChatTelemetryMetadata } from "@/lib/tcc";
import { startStandaloneChatRun } from "@/lib/workflows/start";
import type { RouteContext } from "@/types/api/routes";
import { enforceChatGenerationRatelimit } from "@/utils/chat-ratelimit";

export const maxDuration = 1800;

export const POST = withEvlog(async function POST(
  request: NextRequest,
  { params }: RouteContext<{ organizationId: string }>
) {
  const log = getLogger();
  const requestStartedAt = Date.now();
  const requestId = String(log.getContext().requestId);
  let cleanupOrganizationId: string | null = null;
  let cleanupChatId: string | null = null;
  let cleanupStreamId: string | null = null;

  try {
    const { organizationId } = await params;

    log.set({
      feature: "standalone_chat",
      organizationId,
    });

    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json().catch(() => null);
    const parseResult = standaloneChatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    let messages = stampUserMessageAuthors(
      parseResult.data.messages,
      auth.context.user.id
    );
    const chatId = parseResult.data.chatId ?? generateChatId();
    let projectId: string | null = parseResult.data.projectId ?? null;
    let bindProjectFromSession = false;

    const latestMessage = messages.at(-1);
    if (!latestMessage?.id) {
      return NextResponse.json(
        { error: "Latest message must include an id" },
        { status: 400 }
      );
    }

    const trackBlocked = (code: string) => {
      trackServerEvent({
        event: POSTHOG_EVENTS.CHAT_GENERATION_BLOCKED,
        headers: request.headers,
        userId: auth.context.user.id,
        organizationId,
        properties: { code, chat_id: chatId },
      });
    };

    const existingSession = parseResult.data.chatId
      ? await getChatSessionState(organizationId, chatId)
      : null;
    if (existingSession) {
      if (existingSession.deletedAt !== null) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }
      if (existingSession.externalChannelSource === "slack") {
        trackBlocked("CHAT_READ_ONLY");
        return NextResponse.json(
          {
            error: "Slack-mirrored chats are read-only in the dashboard",
            code: "CHAT_READ_ONLY",
          },
          { status: 409 }
        );
      }
      // Existing chats keep the project stored at creation. Continuing with a
      // different active project must not retarget GEO tools or content.
      bindProjectFromSession = true;
      projectId = existingSession.projectId;
    }

    if (
      projectId &&
      !bindProjectFromSession &&
      !(await isProjectInOrganization(organizationId, projectId))
    ) {
      return NextResponse.json({ error: "Project not found" }, { status: 400 });
    }

    const rateLimited = await enforceChatGenerationRatelimit(
      organizationId,
      auth.context.user.id
    );
    if (rateLimited) {
      return rateLimited;
    }

    let useMarkup = false;
    let chargeAiCredits = false;
    let billingMode: string | null = null;
    if (autumn || allowUnmeteredAiInDevelopment) {
      let billing: Awaited<ReturnType<typeof checkChatBilling>>;
      try {
        billing = await checkChatBilling(organizationId);
      } catch (checkError) {
        console.error("[Autumn] Check error:", {
          requestId,
          customerId: organizationId,
          error: checkError,
        });
        trackBlocked("BILLING_ERROR");
        return NextResponse.json(
          { error: "Failed to check usage limits", code: "BILLING_ERROR" },
          { status: 500 }
        );
      }

      if (!billing.allowed) {
        trackBlocked("USAGE_LIMIT_REACHED");
        return NextResponse.json(
          {
            error: "Usage limit reached",
            code: "USAGE_LIMIT_REACHED",
            balance: billing.balanceRemaining ?? 0,
          },
          { status: 403 }
        );
      }

      useMarkup = billing.useMarkup;
      chargeAiCredits = billing.chargeAiCredits;
      billingMode = billing.mode;
    } else {
      trackBlocked("BILLING_UNAVAILABLE");
      return NextResponse.json(
        { error: "Billing service is unavailable", code: "BILLING_ERROR" },
        { status: 503 }
      );
    }

    cleanupOrganizationId = organizationId;
    cleanupChatId = chatId;
    const context = parseResult.data.context ?? [];

    const streamId = nanoid();
    const streamAcquired = await setActiveChatStream(
      organizationId,
      chatId,
      streamId
    );
    if (!streamAcquired) {
      trackBlocked("ALREADY_GENERATING");
      return NextResponse.json(
        { error: "A response is already being generated for this chat" },
        { status: 409 }
      );
    }
    cleanupStreamId = streamId;

    const hydratedMessages = await hydrateSavedChatPosts(
      organizationId,
      chatId,
      messages
    );
    messages = preserveConversationSelection(
      hydratedMessages,
      existingSession?.messages ?? []
    );

    // Finish all preparation before error cleanup can release the stream lock.
    const [historyResult, integrationsResult, stoppedResult] =
      await Promise.allSettled([
        replaceChatHistory(
          organizationId,
          chatId,
          messages,
          undefined,
          // The snapshot was read before taking the stream lock. Reject it if
          // another response finished in between, rather than saving stale history.
          existingSession
            ? (existingSession.messages.at(-1)?.id ?? null)
            : undefined,
          projectId
        ),
        getStandaloneChatIntegrations(organizationId),
        clearLastResponseStopped(organizationId, chatId),
      ]);

    if (historyResult.status === "rejected") {
      throw historyResult.reason;
    }
    if (integrationsResult.status === "rejected") {
      throw integrationsResult.reason;
    }
    if (stoppedResult.status === "rejected") {
      throw stoppedResult.reason;
    }
    const validatedIntegrations = integrationsResult.value;

    if (!historyResult.value) {
      await clearActiveChatStream(organizationId, chatId, streamId);
      const currentSession = await getChatSessionState(organizationId, chatId);
      if (currentSession && currentSession.deletedAt === null) {
        return NextResponse.json(
          {
            error: "Chat changed while sending. Reload the chat and try again.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (messages.length === 1 && latestMessage.role === "user") {
      // Start immediately alongside the response and keep it alive after the request.
      after(generateAndSetChatTitle(organizationId, chatId, latestMessage));
    }

    const canUseWorkflowStreaming = canUseChatWorkflowStreaming();
    log.set({ chatStartup: { preparationMs: Date.now() - requestStartedAt } });

    trackServerEvent({
      event: POSTHOG_EVENTS.CHAT_MESSAGE_SENT,
      headers: request.headers,
      userId: auth.context.user.id,
      organizationId,
      properties: {
        chat_id: chatId,
        model: parseResult.data.model ?? CHAT_MODEL_AUTO,
        thinking_level: parseResult.data.thinkingLevel ?? null,
        attachment_count: countMessageFileParts(latestMessage),
        context_kinds: getChatContextKinds(context),
        is_new_chat: !parseResult.data.chatId,
        billing_mode: billingMode,
        transport: canUseWorkflowStreaming ? "workflow" : "direct",
      },
    });

    const telemetryMetadata = buildStandaloneChatTelemetryMetadata({
      chatId,
      organizationId,
      routeName: "/api/organizations/[organizationId]/chat",
      userId: auth.context.user.id,
    });

    if (!canUseWorkflowStreaming) {
      return createDirectStandaloneChatResponse({
        streamId,
        organizationId,
        userId: auth.context.user.id,
        chatId,
        messages,
        context,
        validatedIntegrations,
        useMarkup,
        chargeAiCredits,
        requestId,
        log,
        model: parseResult.data.model,
        enableThinking: parseResult.data.enableThinking,
        thinkingLevel: parseResult.data.thinkingLevel,
        timezone: parseResult.data.timezone,
        abortSignal: request.signal,
        telemetryMetadata,
        headers: request.headers,
        projectId: projectId ?? undefined,
        surface: parseResult.data.surface,
      });
    }

    const workflowPayload: ChatWorkflowPayload = {
      streamId,
      requestId,
      organizationId,
      chatId,
      userId: auth.context.user.id,
      userEmail: auth.context.user.email,
      context,
      useMarkup,
      model: parseResult.data.model,
      enableThinking: parseResult.data.enableThinking,
      thinkingLevel: parseResult.data.thinkingLevel,
      timezone: parseResult.data.timezone,
      projectId: projectId ?? undefined,
      surface: parseResult.data.surface,
    };

    await startStandaloneChatRun(workflowPayload);

    return NextResponse.json(
      { ok: true, chatId, streamId },
      {
        status: 202,
        headers: { "X-Chat-Id": chatId, "X-Chat-Stream-Id": streamId },
      }
    );
  } catch (e) {
    if (cleanupOrganizationId && cleanupChatId && cleanupStreamId) {
      await clearActiveChatStream(
        cleanupOrganizationId,
        cleanupChatId,
        cleanupStreamId
      ).catch(() => undefined);
    }
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("[Standalone Chat] Error:", {
      requestId,
      error: errorMessage,
      stack: e instanceof Error ? e.stack : undefined,
    });
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? errorMessage
            : "Failed to process chat request",
      },
      { status: 500 }
    );
  }
});

function canUseChatWorkflowStreaming() {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  return Boolean(realtime && getChatRedis());
}

async function createDirectStandaloneChatResponse({
  streamId,
  organizationId,
  userId,
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
  telemetryMetadata,
  headers,
  projectId,
  surface,
}: {
  streamId: string;
  organizationId: string;
  userId: string;
  chatId: string;
  messages: UIMessage[];
  context: StandaloneChatContextItem[];
  validatedIntegrations: ValidatedIntegration[];
  useMarkup: boolean;
  chargeAiCredits: boolean;
  requestId: string;
  log: ReturnType<typeof getLogger>;
  model?: string;
  enableThinking?: boolean;
  thinkingLevel?: "off" | "low" | "medium" | "high";
  timezone?: string;
  abortSignal?: AbortSignal;
  telemetryMetadata: TccMetadata;
  headers: Headers;
  projectId?: string;
  surface?: ChatWorkflowPayload["surface"];
}) {
  const autumnClient = autumn;

  const lifecycle = await createChatStreamLifecycle({
    organizationId,
    chatId,
    streamId,
    abortSignal,
  });
  const combinedAbortSignal = lifecycle.signal;
  const cleanup = lifecycle.close;

  const streamStartedAt = Date.now();
  let firstChunkAt: number | null = null;
  const usageSnapshot: ChatUsageSnapshot = {};

  const responseReady = createDeferred<Response>();
  const streamDone = createDeferred<void>();

  const runStream = async (streamLog: ReturnType<typeof getLogger>) => {
    const { stream, routingDecision } = await orchestrateStandaloneChat(
      {
        organizationId,
        chatId,
        userId,
        messages: messages as never,
        context,
        maxSteps: 50,
        log: streamLog,
        requestedModel: model,
        enableThinking,
        thinkingLevel,
        timezone,
        abortSignal: combinedAbortSignal,
        telemetryMetadata,
        useMarkup,
        projectId,
        surface,
      },
      {
        preValidatedIntegrations: validatedIntegrations,
        resolveContext: getGitHubToolRepositoryContextByIntegrationId,
        resolveLinearContext: getLinearToolContextByIntegrationId,
        resolveGranolaContext: getGranolaToolContextByIntegrationId,
        onFirstChunk() {
          if (firstChunkAt === null) {
            firstChunkAt = Date.now();
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

          if (
            !autumnClient ||
            allowUnmeteredAiInDevelopment ||
            !chargeAiCredits
          ) {
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
            trackServerEvent({
              event: POSTHOG_EVENTS.AI_CREDITS_CHARGED,
              headers,
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
        log: streamLog,
      }
    );

    const activityTiming = createChatActivityTimingTracker(messages.at(-1));
    const uiStream = toUIMessageStream({
      stream: stream.stream,
      originalMessages: messages as never,
      generateMessageId: nanoid,
      sendReasoning: enableThinking !== false,
      messageMetadata: ({ part }) => {
        const activityTimings = activityTiming.record(part);
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
            activityTimings: activityTiming.timings,
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

        return activityTimings ? { activityTimings } : undefined;
      },
      onEnd: async ({ messages: responseMessages }) => {
        const saved = await replaceChatHistory(
          organizationId,
          chatId,
          responseMessages,
          undefined,
          messages.at(-1)?.id
        );
        if (!saved) {
          console.warn(
            "[Standalone Chat] Skipped saving response: chat was deleted",
            { requestId, organizationId, chatId }
          );
        }
      },
      onError: (error) => {
        const isAbort =
          combinedAbortSignal.aborted ||
          (error instanceof Error && error.name === "AbortError");
        console.error("[Standalone Chat] Direct stream error:", {
          requestId,
          error,
        });
        if (isAbort) {
          return "Generation stopped.";
        }
        if (NoSuchToolError.isInstance(error)) {
          return "The assistant tried to use a tool that isn't available right now. Please try sending your message again.";
        }
        if (InvalidToolInputError.isInstance(error)) {
          return "The assistant called a tool with invalid inputs and couldn't recover. Please try sending your message again.";
        }
        return "An error occurred while processing your request.";
      },
    });

    return createUIMessageStreamResponse({
      headers: { "X-Chat-Id": chatId, "X-Chat-Stream-Id": streamId },
      stream: withChatStreamCleanup(uiStream, async () => {
        try {
          await cleanup();
        } finally {
          streamDone.resolve();
        }
      }),
    });
  };

  const fork = (
    log as typeof log & {
      fork?: (label: string, callback: () => Promise<void>) => void;
    }
  ).fork;

  if (fork) {
    fork("standalone_chat_stream", async () => {
      try {
        const response = await runStream(getLogger());
        responseReady.resolve(response);
        await streamDone.promise;
      } catch (error) {
        responseReady.reject(error);
        streamDone.resolve();
        await cleanup();
        throw error;
      }
    });
    return responseReady.promise;
  }

  try {
    return await runStream(log);
  } catch (error) {
    await cleanup();
    throw error;
  }
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
