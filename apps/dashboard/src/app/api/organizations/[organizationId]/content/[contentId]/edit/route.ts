import { type NextRequest, NextResponse } from "next/server";
import { createChatAgent } from "@/lib/ai/agents/chat";
import { db } from "@notra/db/drizzle";
import { brandSettings } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { editContentSchema } from "@/utils/schemas/content";

interface RouteContext {
  params: Promise<{ organizationId: string; contentId: string }>;
}

export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json();
    const validationResult = editContentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { instruction, currentMarkdown, selectedText } =
      validationResult.data;

    let updatedMarkdown = currentMarkdown;

    const brand = await db.query.brandSettings.findFirst({
      where: eq(brandSettings.organizationId, organizationId),
    });

    const brandContext = brand
      ? `Company: ${brand.companyName ?? ""}\nDescription: ${brand.companyDescription ?? ""}\nAudience: ${brand.audience ?? ""}\nTone: ${brand.toneProfile ?? ""}\nCustom instructions: ${brand.customInstructions ?? ""}`
      : undefined;

    const agent = await createChatAgent(
      {
        organizationId,
        currentMarkdown,
        selectedText,
        onMarkdownUpdate: (markdown) => {
          updatedMarkdown = markdown;
        },
        brandContext,
      },
      instruction,
    );

    await agent.generate({ prompt: instruction });

    return NextResponse.json({
      markdown: updatedMarkdown,
    });
  } catch (error) {
    console.error("Error editing content:", error);
    return NextResponse.json(
      { error: "Failed to edit content" },
      { status: 500 },
    );
  }
}
