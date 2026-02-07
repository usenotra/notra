import { type NextRequest, NextResponse } from "next/server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import {
  addRepository,
  getGitHubIntegrationById,
  listAvailableRepositories,
} from "@/lib/services/github-integration";
import {
  addRepositoryRequestSchema,
  integrationIdParamSchema,
} from "@/utils/schemas/integrations";

interface RouteContext {
  params: Promise<{ organizationId: string; integrationId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId, integrationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const paramValidation = integrationIdParamSchema.safeParse({
      integrationId,
    });

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: paramValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const integration = await getGitHubIntegrationById(integrationId);

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    if (integration.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const repositories = await listAvailableRepositories(
      integrationId,
      auth.context.user.id
    );

    return NextResponse.json(repositories);
  } catch (error) {
    console.error("Error listing repositories:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId, integrationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const paramValidation = integrationIdParamSchema.safeParse({
      integrationId,
    });

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: paramValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const integration = await getGitHubIntegrationById(integrationId);

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    if (integration.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validationResult = addRepositoryRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { owner, repo, outputs } = validationResult.data;

    const repository = await addRepository({
      integrationId,
      owner,
      repo,
      outputs,
      userId: auth.context.user.id,
    });

    return NextResponse.json(repository);
  } catch (error) {
    console.error("Error adding repository:", error);

    if (
      error instanceof Error &&
      error.message === "Repository already connected"
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
