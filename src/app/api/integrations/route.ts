import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  createGitHubIntegration,
  getGitHubIntegrationsByOrganization,
} from "@/lib/services/github-integration";
import {
  createGitHubIntegrationRequestSchema,
  getIntegrationsQuerySchema,
} from "@/utils/schemas/integrations";

export async function POST(request: NextRequest) {
  try {
    const { session, user } = await getServerSession({
      headers: request.headers,
    });

    if (!(user && session?.activeOrganizationId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult =
      createGitHubIntegrationRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const displayName = `${data.owner}/${data.repo}`;

    const integration = await createGitHubIntegration({
      organizationId: data.organizationId,
      userId: user.id,
      token: data.token || null,
      displayName,
      owner: data.owner,
      repo: data.repo,
    });

    return NextResponse.json(integration);
  } catch (error) {
    console.error("Error creating integration:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { session, user } = await getServerSession({
      headers: request.headers,
    });

    if (!(user && session?.activeOrganizationId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    const validationResult = getIntegrationsQuerySchema.safeParse({
      organizationId,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { organizationId: validatedOrganizationId } = validationResult.data;

    const integrations = await getGitHubIntegrationsByOrganization(
      validatedOrganizationId
    );

    return NextResponse.json(integrations);
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
