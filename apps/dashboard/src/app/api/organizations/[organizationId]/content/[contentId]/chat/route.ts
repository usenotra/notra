import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { orchestrateChat } from "@/lib/ai/orchestration";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { chatRequestSchema } from "@/utils/schemas/content";

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
    const parseResult = chatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { messages, currentMarkdown, selection, context } = parseResult.data;

    const { stream, routingDecision } = await orchestrateChat({
      organizationId,
      messages,
      currentMarkdown,
      selection,
      context,
      maxSteps: 1,
    });

    console.log("[Content Chat]", routingDecision);

    return stream.toUIMessageStreamResponse();
  } catch (_e) {
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
