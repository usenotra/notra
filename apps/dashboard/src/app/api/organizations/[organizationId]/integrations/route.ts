import { type NextRequest, NextResponse } from "next/server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { createGitHubIntegration } from "@/lib/services/github-integration";
import { getIntegrationsByOrganization } from "@/lib/services/integrations";
import { createGitHubIntegrationRequestSchema } from "@/utils/schemas/integrations";

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const result = await getIntegrationsByOrganization(organizationId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json();
    const validationResult = createGitHubIntegrationRequestSchema
      .omit({ organizationId: true })
      .safeParse(body);

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
      organizationId,
      userId: auth.context.user.id,
      token: data.token || null,
      displayName,
      owner: data.owner,
      repo: data.repo,
    });

    return NextResponse.json(integration);
  } catch (error) {
    console.error("Error creating integration:", error);
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
