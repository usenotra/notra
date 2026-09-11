import { calculateAiCreditCostCents } from "@notra/ai/billing/ai-credit-cost";
import {
  allowUnmeteredAiInDevelopment,
  autumn,
} from "@notra/ai/billing/autumn";
import { checkChatBilling } from "@notra/ai/billing/chat-billing";
import { FEATURES } from "@notra/ai/billing/features";
import {
  listContentChatSessions,
  replaceContentChatHistory,
} from "@notra/ai/chat/history";
import { useLogger as getLogger, withEvlog } from "@notra/ai/evlog";
import {
  getGitHubIntegrationById,
  getGitHubToolRepositoryContextByIntegrationId,
} from "@notra/ai/integrations/github";
import {
  getLinearIntegrationById,
  getLinearToolContextByIntegrationId,
} from "@notra/ai/integrations/linear";
import { orchestrateChat } from "@notra/ai/orchestration/orchestrate";
import { routeUsageProperties } from "@notra/ai/utils/route-usage";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { chatRequestSchema } from "@notra/schemas/dashboard/content";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AI_CREDITS_SOURCE_CONTENT_CHAT } from "@/constants/studio-analytics";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import type { RouteContext } from "@/types/api/routes";
import { enforceChatGenerationRatelimit } from "@/utils/chat-ratelimit";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: RouteContext<{ organizationId: string; contentId: string }>
) {
  const { organizationId, contentId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const contentExists = await db.query.posts.findFirst({
    where: and(
      eq(posts.id, contentId),
      eq(posts.organizationId, organizationId)
    ),
    columns: { id: true },
  });
  if (!contentExists) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  const sessions = await listContentChatSessions(organizationId, contentId);
  return NextResponse.json({ sessions });
}

export const POST = withEvlog(async function POST(
  request: NextRequest,
  { params }: RouteContext<{ organizationId: string; contentId: string }>
) {
  const log = getLogger();
  const requestId = String(log.getContext().requestId);

  try {
    const { organizationId, contentId } = await params;

    log.set({
      feature: "content_chat",
      organizationId,
      contentId,
    });

    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json().catch(() => null);
    const parseResult = chatRequestSchema.safeParse(body);

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
        return NextResponse.json(
          { error: "Failed to check usage limits", code: "BILLING_ERROR" },
          { status: 500 }
        );
      }

      if (!billing.allowed) {
        console.log("[Autumn] Usage limit reached:", {
          requestId,
          customerId: organizationId,
          balance: billing.balanceRemaining ?? 0,
        });
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

    const {
      chatId,
      messages,
      currentMarkdown,
      contentType,
      documentMode,
      selection,
      context,
      timezone,
    } = parseResult.data;

    const contentExists = await db.query.posts.findFirst({
      where: and(
        eq(posts.id, contentId),
        eq(posts.organizationId, organizationId)
      ),
      columns: { id: true },
    });
    if (!contentExists) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const historySaved = await replaceContentChatHistory(
      organizationId,
      contentId,
      chatId,
      messages
    );
    if (!historySaved) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    trackServerEvent({
      event: POSTHOG_EVENTS.CONTENT_AGENT_MESSAGE_SENT,
      headers: request.headers,
      userId: auth.context.user.id,
      organizationId,
      properties: {
        content_id: contentId,
        chat_id: chatId,
        content_type: contentType ?? null,
        has_selection: Boolean(selection),
        context_count: context?.length ?? 0,
      },
    });

    const autumnClient = autumn;
    const imageDefaults =
      contentType === "image"
        ? await getImageDefaults({ organizationId, contentId }).catch(
            (error) => {
              console.warn("[Content Chat] Failed to load image defaults", {
                requestId,
                organizationId,
                contentId,
                error,
              });
              return undefined;
            }
          )
        : undefined;

    const { stream, routingDecision } = await orchestrateChat(
      {
        organizationId,
        messages,
        currentMarkdown,
        contentType,
        documentMode,
        currentPostId: contentId,
        userId: auth.context.user.id,
        imageDefaults,
        selection,
        context,
        maxSteps: 50,
        log,
        timezone,
        useMarkup,
        telemetryMetadata: {
          contentId,
          contentType: contentType ?? "unknown",
          feature: "content_chat",
          organizationId,
          routeName:
            "/api/organizations/[organizationId]/content/[contentId]/chat",
          "tcc.conversational": "true",
          userId: auth.context.user.id,
        },
      },
      {
        integrationFetchers: {
          getGitHubIntegrationById,
          getLinearIntegrationById,
        },
        resolveContext: getGitHubToolRepositoryContextByIntegrationId,
        resolveLinearContext: getLinearToolContextByIntegrationId,
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
                source: "chat",
                content_id: contentId,
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
                source: AI_CREDITS_SOURCE_CONTENT_CHAT,
                model: modelId,
                billing_basis: cost.billingBasis,
                tokens: usage.totalTokens ?? 0,
                content_id: contentId,
              },
            });
          } catch (trackError) {
            console.error("[Autumn] Track error after chat completion:", {
              requestId,
              customerId: organizationId,
              error: trackError,
            });
          }
        },
        log,
      }
    );

    console.log("[Content Chat] Routing decision:", {
      requestId,
      decision: routingDecision,
    });

    return stream.toUIMessageStreamResponse({
      originalMessages: messages as never,
      generateMessageId: nanoid,
      sendReasoning: true,
      headers: { "X-Chat-Id": chatId },
      onFinish: async ({ messages: responseMessages }) => {
        const saved = await replaceContentChatHistory(
          organizationId,
          contentId,
          chatId,
          responseMessages
        );
        if (!saved) {
          console.warn("[Content Chat] Skipped saving response", {
            requestId,
            organizationId,
            contentId,
            chatId,
          });
        }
      },
      onError: (error) => {
        console.error("[Content Chat] Stream error:", { requestId, error });
        return "An error occurred while processing your request.";
      },
    });
  } catch (e) {
    console.error("[Content Chat] Error:", {
      requestId,
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
});

async function getImageDefaults(params: {
  organizationId: string;
  contentId: string;
}) {
  const post = await db.query.posts.findFirst({
    where: and(
      eq(posts.id, params.contentId),
      eq(posts.organizationId, params.organizationId)
    ),
    columns: {
      title: true,
      sourceMetadata: true,
    },
  });

  const metadata = post?.sourceMetadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return;
  }

  const integrationId =
    "integrationId" in metadata && typeof metadata.integrationId === "string"
      ? metadata.integrationId
      : null;
  const branch =
    "branch" in metadata && typeof metadata.branch === "string"
      ? metadata.branch
      : null;
  const brandIdentityId = getStoredBrandIdentityId(metadata);
  const sandbox =
    "sandbox" in metadata &&
    metadata.sandbox &&
    typeof metadata.sandbox === "object"
      ? metadata.sandbox
      : null;
  const snapshotId =
    sandbox && "snapshotId" in sandbox && typeof sandbox.snapshotId === "string"
      ? sandbox.snapshotId
      : null;

  if (!(integrationId && branch && snapshotId && post?.title)) {
    return;
  }

  return {
    integrationId,
    branch,
    title: post.title,
    brandIdentityId,
  };
}

function getStoredBrandIdentityId(metadata: object) {
  if (
    "brandIdentityId" in metadata &&
    typeof metadata.brandIdentityId === "string"
  ) {
    return metadata.brandIdentityId;
  }

  if ("brandVoiceId" in metadata && typeof metadata.brandVoiceId === "string") {
    return metadata.brandVoiceId;
  }

  return undefined;
}
