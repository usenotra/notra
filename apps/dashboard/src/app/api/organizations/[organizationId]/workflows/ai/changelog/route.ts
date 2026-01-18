import { type NextRequest, NextResponse } from "next/server";
import { createGithubChangelogAgent } from "@/lib/ai/agents/changelog";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { generateChangelogBodySchema } from "@/utils/schemas/workflows";

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json();
    const validationResult = generateChangelogBodySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { prompt } = validationResult.data;

    const agent = createGithubChangelogAgent(organizationId);

    const result = await agent.stream({
      prompt,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error generating changelog:", error);
    return NextResponse.json(
      { error: "Failed to generate changelog" },
      { status: 500 }
    );
  }
}
