import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  addRepository,
  getGitHubIntegrationById,
  listAvailableRepositories,
  validateUserOrgAccess,
} from "@/lib/services/github-integration";
import {
  addRepositoryRequestSchema,
  integrationIdParamSchema,
} from "@/utils/schemas/integrations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { session, user } = await getServerSession({
      headers: request.headers,
    });

    if (!(user && session?.activeOrganizationId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const paramsData = await params;
    const paramValidation = integrationIdParamSchema.safeParse(paramsData);

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: paramValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { integrationId } = paramValidation.data;
    const integration = await getGitHubIntegrationById(integrationId);

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const hasAccess = await validateUserOrgAccess(
      user.id,
      integration.organizationId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      userId: user.id,
    });

    return NextResponse.json(repository);
  } catch (error) {
    console.error("Error adding repository:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { session, user } = await getServerSession({
      headers: request.headers,
    });

    if (!(user && session?.activeOrganizationId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const paramsData = await params;
    const paramValidation = integrationIdParamSchema.safeParse(paramsData);

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: paramValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { integrationId } = paramValidation.data;
    const integration = await getGitHubIntegrationById(integrationId);

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const hasAccess = await validateUserOrgAccess(
      user.id,
      integration.organizationId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const repositories = await listAvailableRepositories(
      integrationId,
      user.id
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
