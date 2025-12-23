import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  deleteGitHubIntegration,
  getGitHubIntegrationById,
  updateGitHubIntegration,
  validateUserOrgAccess,
} from "@/lib/services/github-integration";
import {
  integrationIdParamSchema,
  updateIntegrationBodySchema,
} from "@/utils/schemas/integrations";

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

    return NextResponse.json(integration);
  } catch (error) {
    console.error("Error fetching integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const bodyValidation = updateIntegrationBodySchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: bodyValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { enabled, displayName } = bodyValidation.data;
    const updated = await updateGitHubIntegration(integrationId, {
      enabled,
      displayName,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await deleteGitHubIntegration(integrationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
