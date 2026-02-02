import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@notra/db/drizzle";
import { brandSettings } from "@notra/db/schema";
import { createGithubChangelogAgent } from "@/lib/ai/agents/changelog";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { generateChangelogBodySchema } from "@/utils/schemas/workflows";
import { getValidToneProfile } from "@/lib/ai/prompts/changelog/casual";

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
        { status: 400 },
      );
    }

    const { prompt } = validationResult.data;

    // Fetch brand settings for the organization
    const brand = await db.query.brandSettings.findFirst({
      where: eq(brandSettings.organizationId, organizationId),
    });

    const agent = createGithubChangelogAgent({
      organizationId,
      tone: getValidToneProfile(brand?.toneProfile, "Conversational"),
      companyName: brand?.companyName || undefined,
      companyDescription: brand?.companyDescription || undefined,
      audience: brand?.audience || undefined,
      customInstructions: brand?.customInstructions || undefined,
    });

    const result = await agent.stream({
      prompt,
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error("[Changelog] Stream error:", error);
        if (error instanceof Error) {
          return error.message;
        }
        return "An error occurred while generating the changelog.";
      },
    });
  } catch (error) {
    console.error("Error generating changelog:", error);
    return NextResponse.json(
      { error: "Failed to generate changelog" },
      { status: 500 },
    );
  }
}
