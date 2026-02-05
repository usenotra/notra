import { type NextRequest, NextResponse } from "next/server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import {
  generateWebhookSecretForRepository,
  getRepositoryById,
  getWebhookConfigForRepository,
} from "@/lib/services/github-integration";
import { repositoryIdParamSchema } from "@/utils/schemas/integrations";

interface RouteContext {
  params: Promise<{ organizationId: string; repositoryId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId, repositoryId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const paramValidation = repositoryIdParamSchema.safeParse({ repositoryId });

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: paramValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const repository = await getRepositoryById(repositoryId);

    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    if (repository.integration?.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    const webhookConfig = await getWebhookConfigForRepository(
      repositoryId,
      auth.context.user.id
    );

    if (!webhookConfig) {
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 404 }
      );
    }

    return NextResponse.json(webhookConfig);
  } catch (error) {
    console.error("Error fetching webhook config:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId, repositoryId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const paramValidation = repositoryIdParamSchema.safeParse({ repositoryId });

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: paramValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const repository = await getRepositoryById(repositoryId);

    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    if (repository.integration?.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    const webhookConfig = await generateWebhookSecretForRepository(
      repositoryId,
      auth.context.user.id
    );

    return NextResponse.json(webhookConfig);
  } catch (error) {
    console.error("Error generating webhook secret:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
