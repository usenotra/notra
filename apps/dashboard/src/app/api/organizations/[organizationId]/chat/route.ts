import { calculateAiCreditCostCents } from "@notra/ai/billing/ai-credit-cost";
import {
  allowUnmeteredAiInDevelopment,
  autumn,
} from "@notra/ai/billing/autumn";
import { checkChatBilling } from "@notra/ai/billing/chat-billing";
import { FEATURES } from "@notra/ai/billing/features";
import { startChatAbortPolling } from "@notra/ai/chat/abort-polling";
import { getChatRedis } from "@notra/ai/chat/config";
import {
  clearActiveChatStream,
  clearChatAbortFlag,
  clearLastResponseStopped,
  generateAndSetChatTitle,
  generateChatId,
  getChatSession,
  isChatDeleted,
  replaceChatHistory,
  setActiveChatStream,
} from "@notra/ai/chat/history";
import { getStandaloneChatIntegrations } from "@notra/ai/chat/integrations-cache";
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
import { routeUsageProperties } from "@notra/ai/utils/route-usage";
import { isProjectInOrganization } from "@notra/db/utils/projects";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { InvalidToolInputError, NoSuchToolError, type UIMessage } from "ai";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

    const messages = stampUserMessageAuthors(
      parseResult.data.messages,
      auth.context.user.id
    );
    const chatId = parseResult.data.chatId ?? generateChatId();
    let projectId: string | null = parseResult.data.projectId ?? null;

    const trackBlocked = (code: string) => {
      trackServerEvent({
        event: POSTHOG_EVENTS.CHAT_GENERATION_BLOCKED,
        headers: request.headers,
        userId: auth.context.user.id,
        organizationId,
        properties: { code, chat_id: chatId },
      });
    };

    if (parseResult.data.chatId) {
      const existingSession = await getChatSession(organizationId, chatId);
      if (existingSession?.externalChannelId?.source === "slack") {
        trackBlocked("CHAT_READ_ONLY");
        return NextResponse.json(
          {
            error: "Slack-mirrored chats are read-only in the dashboard",
            code: "CHAT_READ_ONLY",
          },
          { status: 409 }
        );
      }
      // The project is only stored when the chat row is first created, so
      // existing chats skip the validation lookup.
      if (existingSession) {
        projectId = null;
      }
    }

    if (
      projectId &&
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
    const validatedIntegrations =
      await getStandaloneChatIntegrations(organizationId);
    const context = parseResult.data.context ?? [];

    if (!messages.length) {
      return NextResponse.json(
        { error: "At least one message is required" },
        { status: 400 }
      );
    }

    const latestMessage = messages.at(-1);
    if (!latestMessage?.id) {
      return NextResponse.json(
        { error: "Latest message must include an id" },
        { status: 400 }
      );
    }

    if (
      parseResult.data.chatId &&
      (await isChatDeleted(organizationId, chatId))
    ) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const streamAcquired = await setActiveChatStream(
      organizationId,
      chatId,
      latestMessage.id
    );
    if (!streamAcquired) {
      trackBlocked("ALREADY_GENERATING");
      return NextResponse.json(
        { error: "A response is already being generated for this chat" },
        { status: 409 }
      );
    }
    cleanupStreamId = latestMessage.id;

    const [historySaved] = await Promise.all([
      replaceChatHistory(
        organizationId,
        chatId,
        messages,
        undefined,
        undefined,
        projectId
      ),
      clearLastResponseStopped(organizationId, chatId),
    ]);

    if (!historySaved) {
      await clearActiveChatStream(organizationId, chatId, latestMessage.id);
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (messages.length === 1 && latestMessage.role === "user") {
      await generateAndSetChatTitle(organizationId, chatId, latestMessage);
    }

    const canUseWorkflowStreaming = canUseChatWorkflowStreaming();

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
      });
    }

    const workflowPayload: ChatWorkflowPayload = {
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
    };

    await startStandaloneChatRun(workflowPayload);

    return NextResponse.json(
      { ok: true, chatId, streamId: latestMessage.id },
      { status: 202, headers: { "X-Chat-Id": chatId } }
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
}: {
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
}) {
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

    return stream.toUIMessageStreamResponse({
      originalMessages: messages as never,
      generateMessageId: nanoid,
      sendReasoning: enableThinking !== false,
      headers: { "X-Chat-Id": chatId },
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
              "[Standalone Chat] Skipped saving response: chat was deleted",
              { requestId, organizationId, chatId }
            );
          }
        } finally {
          await cleanup();
          streamDone.resolve();
        }
      },
      onError: (error) => {
        cleanup().catch(() => undefined);
        streamDone.resolve();
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
        if (NoSuchToolError.isInstance(error)) {
          return "The assistant tried to use a tool that isn't available right now. Please try sending your message again.";
        }
        if (InvalidToolInputError.isInstance(error)) {
          return "The assistant called a tool with invalid inputs and couldn't recover. Please try sending your message again.";
        }
        return "An error occurred while processing your request.";
      },
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
