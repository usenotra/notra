import { calculateAiCreditCostCents } from "@notra/ai/billing/ai-credit-cost";
import {
  allowUnmeteredAiInDevelopment,
  autumn,
} from "@notra/ai/billing/autumn";
import { checkChatBilling } from "@notra/ai/billing/chat-billing";
import { FEATURES } from "@notra/ai/billing/features";
import {
  clearActiveChatStream,
  getChatSession,
  listChatSessions,
  loadChatHistory,
  replaceChatHistory,
  setActiveChatStream,
} from "@notra/ai/chat/history";
import { DASHBOARD_AGENT_EXTERNAL_CHANNEL_ID } from "@notra/ai/constants/dashboard-agent";
import { useLogger as getLogger, withEvlog } from "@notra/ai/evlog";
import { getGitHubToolRepositoryContextByIntegrationId } from "@notra/ai/integrations/github";
import { getGranolaToolContextByIntegrationId } from "@notra/ai/integrations/granola";
import { getLinearToolContextByIntegrationId } from "@notra/ai/integrations/linear";
import { orchestrateStandaloneChat } from "@notra/ai/orchestration/orchestrate-standalone";
import { dashboardAgentChatRequestSchema } from "@notra/ai/schemas/chat";
import { stampUserMessageAuthors } from "@notra/ai/utils/chat";
import { sessionMatchesInbox } from "@notra/ai/utils/chat-surface";
import { routeUsageProperties } from "@notra/ai/utils/route-usage";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AI_CREDITS_SOURCE_DASHBOARD_AGENT_CHAT } from "@/constants/studio-analytics";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import type { RouteContext } from "@/types/api/routes";
import { enforceChatGenerationRatelimit } from "@/utils/chat-ratelimit";

export const maxDuration = 300;

export async function GET(
  request: NextRequest,
  { params }: RouteContext<{ organizationId: string }>
) {
  const { organizationId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const sessions = await listChatSessions(organizationId, { inbox: "agent" });
  return NextResponse.json({ sessions });
}

export const POST = withEvlog(async function POST(
  request: NextRequest,
  { params }: RouteContext<{ organizationId: string }>
) {
  const requestId = nanoid(10);
  const log = getLogger();
  let releaseStream: (() => Promise<unknown>) | undefined;

  try {
    const { organizationId } = await params;

    log.set({
      feature: "dashboard_agent_chat",
      organizationId,
      requestId,
    });

    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json().catch(() => null);
    const parseResult = dashboardAgentChatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.issues },
        { status: 400 }
      );
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
    const autumnClient = autumn;
    if (autumnClient || allowUnmeteredAiInDevelopment) {
      let billing: Awaited<ReturnType<typeof checkChatBilling>>;
      try {
        billing = await checkChatBilling(organizationId);
      } catch (checkError) {
        console.error("[Autumn] Check error:", {
          requestId,
          customerId: organizationId,
          error: checkError,
        });
        return NextResponse.json(
          { error: "Failed to check usage limits", code: "BILLING_ERROR" },
          { status: 500 }
        );
      }

      if (!billing.allowed) {
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
    } else {
      return NextResponse.json(
        { error: "Billing service is unavailable", code: "BILLING_ERROR" },
        { status: 503 }
      );
    }

    const userMessage = parseResult.data.messages.at(-1);
    if (userMessage?.role !== "user") {
      return NextResponse.json(
        { error: "The latest message must be a user message" },
        { status: 400 }
      );
    }
    const chatId = parseResult.data.chatId;
    const streamAcquired = await setActiveChatStream(
      organizationId,
      chatId,
      requestId
    );
    if (!streamAcquired) {
      return NextResponse.json(
        { error: "A response is already being generated for this chat" },
        { status: 409 }
      );
    }
    const cleanup = () =>
      clearActiveChatStream(organizationId, chatId, requestId);
    releaseStream = cleanup;
    const existingSession = await getChatSession(organizationId, chatId);
    if (existingSession && !sessionMatchesInbox(existingSession, "agent")) {
      await cleanup();
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const existingMessages = await loadChatHistory(organizationId, chatId);
    if (existingMessages.some((message) => message.id === userMessage.id)) {
      await cleanup();
      return NextResponse.json(
        { error: "This message has already been submitted" },
        { status: 409 }
      );
    }
    const messages = [
      ...existingMessages,
      ...stampUserMessageAuthors([userMessage], auth.context.user.id),
    ];
    const historySaved = await replaceChatHistory(
      organizationId,
      chatId,
      messages,
      DASHBOARD_AGENT_EXTERNAL_CHANNEL_ID,
      existingMessages.at(-1)?.id ?? null
    );
    if (!historySaved) {
      await cleanup();
      return NextResponse.json(
        { error: "Chat history changed. Reload the chat and try again." },
        { status: 409 }
      );
    }

    const { stream } = await orchestrateStandaloneChat(
      {
        organizationId,
        chatId,
        userId: auth.context.user.id,
        messages,
        maxSteps: 50,
        log,
        timezone: parseResult.data.timezone,
        abortSignal: request.signal,
        useMarkup,
        projectId: parseResult.data.projectId,
        telemetryMetadata: {
          chatId,
          feature: "dashboard_agent_chat",
          organizationId,
          routeName: "/api/organizations/[organizationId]/dashboard-agent/chat",
          "tcc.conversational": "true",
          userId: auth.context.user.id,
        },
      },
      {
        log,
        resolveContext: getGitHubToolRepositoryContextByIntegrationId,
        resolveLinearContext: getLinearToolContextByIntegrationId,
        resolveGranolaContext: getGranolaToolContextByIntegrationId,
        async onUsage(usage, modelId, routeUsage) {
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
                source: "dashboard_agent_chat",
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
              headers: request.headers,
              userId: auth.context.user.id,
              organizationId,
              properties: {
                cost_cents: cost.costCents,
                source: AI_CREDITS_SOURCE_DASHBOARD_AGENT_CHAT,
                model: modelId,
                billing_basis: cost.billingBasis,
                tokens: usage.totalTokens ?? 0,
              },
            });
          } catch (trackError) {
            console.error("[Autumn] Track error after dashboard agent chat:", {
              requestId,
              customerId: organizationId,
              error: trackError,
            });
          }
        },
      }
    );

    return stream.toUIMessageStreamResponse({
      originalMessages: messages as never,
      generateMessageId: nanoid,
      sendReasoning: true,
      headers: { "X-Chat-Id": chatId },
      onFinish: async ({ messages: responseMessages }) => {
        try {
          const saved = await replaceChatHistory(
            organizationId,
            chatId,
            responseMessages,
            DASHBOARD_AGENT_EXTERNAL_CHANNEL_ID,
            userMessage.id
          );
          if (!saved) {
            console.warn("[Dashboard Agent Chat] Skipped saving response", {
              requestId,
              organizationId,
              chatId,
            });
          }
        } finally {
          await cleanup();
        }
      },
      onError: (error) => {
        cleanup().catch(() => undefined);
        console.error("[Dashboard Agent Chat] Stream error:", {
          requestId,
          error,
        });
        return "An error occurred while processing your request.";
      },
    });
  } catch (e) {
    await releaseStream?.().catch(() => undefined);
    console.error("[Dashboard Agent Chat] Error:", {
      requestId,
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
});
