import { Autumn } from "autumn-js";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { orchestrateChat } from "@/lib/ai/orchestration";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { FEATURES } from "@/lib/billing/constants";
import { chatRequestSchema } from "@/utils/schemas/content";

const autumn = new Autumn();

interface RouteContext {
  params: Promise<{ organizationId: string; contentId: string }>;
}

export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: RouteContext) {
  const requestId = nanoid(10);

  try {
    const { organizationId } = await params;

    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    console.log("[Autumn] Checking feature access:", {
      requestId,
      customerId: organizationId,
      featureId: FEATURES.CHAT_MESSAGES,
    });

    const { data: checkData, error: checkError } = await autumn.check({
      customer_id: organizationId,
      feature_id: FEATURES.CHAT_MESSAGES,
    });

    if (checkError) {
      console.error("[Autumn] Check error:", {
        requestId,
        customerId: organizationId,
        error: checkError,
      });
    }

    if (!checkData?.allowed) {
      console.log("[Autumn] Usage limit reached:", {
        requestId,
        customerId: organizationId,
        balance: checkData?.balance ?? 0,
      });
      return NextResponse.json(
        {
          error: "Usage limit reached",
          code: "USAGE_LIMIT_REACHED",
          balance: checkData?.balance ?? 0,
        },
        { status: 403 }
      );
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

    const { error: trackError } = await autumn.track({
      customer_id: organizationId,
      feature_id: FEATURES.CHAT_MESSAGES,
      value: 1,
    });

    if (trackError) {
      console.error("[Autumn] Track error:", { requestId, customerId: organizationId, error: trackError });
    }

    let tracked = !trackError;

    try {
      const { stream, routingDecision } = await orchestrateChat({
        organizationId,
        messages,
        currentMarkdown,
        selection,
        context,
        maxSteps: 1,
      });

      console.log("[Content Chat] Routing decision:", { requestId, decision: routingDecision });

      return stream.toUIMessageStreamResponse();
    } catch (orchestrationError) {
      if (tracked) {
        await autumn.track({
          customer_id: organizationId,
          feature_id: FEATURES.CHAT_MESSAGES,
          value: -1,
        });
        console.log("[Autumn] Usage compensated after orchestration failure:", { requestId });
      }
      throw orchestrationError;
    }
  } catch (e) {
    console.error("[Content Chat] Error:", { requestId, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
