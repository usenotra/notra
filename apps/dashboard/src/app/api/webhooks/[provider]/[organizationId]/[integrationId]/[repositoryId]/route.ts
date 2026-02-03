import { type NextRequest, NextResponse } from "next/server";
import {
  getGitHubIntegrationById,
  getRepositoryById,
} from "@/lib/services/github-integration";
import { handleGitHubWebhook } from "@/lib/webhooks/github";
import { handleLinearWebhook } from "@/lib/webhooks/linear";
import type { WebhookContext, WebhookHandler } from "@/types/webhooks";
import type { InputIntegrationType } from "@/utils/schemas/integrations";
import { webhookParamsWithRepoSchema } from "@/utils/schemas/webhooks";

interface RouteContext {
  params: Promise<{
    provider: string;
    organizationId: string;
    integrationId: string;
    repositoryId: string;
  }>;
}

const WEBHOOK_HANDLERS: Record<InputIntegrationType, WebhookHandler | null> = {
  github: handleGitHubWebhook,
  linear: handleLinearWebhook,
  slack: null,
};

type IntegrationFetcher = (
  integrationId: string
) => Promise<{ organizationId: string; enabled: boolean } | null | undefined>;

const INTEGRATION_FETCHERS: Record<
  InputIntegrationType,
  IntegrationFetcher | null
> = {
  github: async (integrationId) => {
    const integration = await getGitHubIntegrationById(integrationId);
    if (!integration) {
      return null;
    }
    return {
      organizationId: integration.organizationId,
      enabled: integration.enabled,
    };
  },
  linear: null,
  slack: null,
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const rawParams = await params;

  const validation = webhookParamsWithRepoSchema.safeParse(rawParams);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid webhook parameters",
        details: validation.error.issues,
      },
      { status: 400 }
    );
  }

  const { provider, organizationId, integrationId, repositoryId } =
    validation.data;

  const fetcher = INTEGRATION_FETCHERS[provider];
  if (!fetcher) {
    return NextResponse.json(
      { error: `Provider ${provider} is not yet supported` },
      { status: 501 }
    );
  }

  try {
    const integration = await fetcher(integrationId);

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    if (integration.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Integration does not belong to this organization" },
        { status: 403 }
      );
    }

    if (!integration.enabled) {
      return NextResponse.json(
        { error: "Integration is disabled" },
        { status: 403 }
      );
    }

    // Verify repository belongs to this integration
    const repository = await getRepositoryById(repositoryId);
    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    if (repository.integration.id !== integrationId) {
      return NextResponse.json(
        { error: "Repository does not belong to this integration" },
        { status: 403 }
      );
    }

    const handler = WEBHOOK_HANDLERS[provider];
    if (!handler) {
      return NextResponse.json(
        { error: `Webhook handler for ${provider} is not yet implemented` },
        { status: 501 }
      );
    }

    const rawBody = await request.text();

    const context: WebhookContext = {
      provider,
      organizationId,
      integrationId,
      repositoryId,
      request,
      rawBody,
    };

    const result = await handler(context);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message ?? "Webhook processing failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      received: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error processing webhook" },
      { status: 500 }
    );
  }
}
