import { withOrganizationAuth } from "@/lib/auth/organization";
import { checkLogRetention } from "@/lib/billing/check-log-retention";
import { db } from "@notra/db/drizzle";
import { contentTriggers } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { triggerScheduleNow } from "@/lib/triggers/qstash";
import { appendWebhookLog } from "@/lib/webhooks/logging";

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

    const { searchParams } = new URL(request.url);
    const triggerId = searchParams.get("triggerId");

    if (!triggerId) {
      return NextResponse.json(
        { error: "Trigger ID required" },
        { status: 400 },
      );
    }

    const trigger = await db.query.contentTriggers.findFirst({
      where: and(
        eq(contentTriggers.id, triggerId),
        eq(contentTriggers.organizationId, organizationId),
      ),
    });

    if (!trigger) {
      return NextResponse.json(
        { error: "Trigger not found" },
        { status: 404 },
      );
    }

    if (!trigger.enabled) {
      return NextResponse.json(
        { error: "Cannot run a disabled schedule" },
        { status: 400 },
      );
    }

    const workflowRunId = await triggerScheduleNow(triggerId);
    const logRetentionDays = await checkLogRetention(organizationId);

    await appendWebhookLog({
      organizationId,
      integrationId: triggerId,
      integrationType: "manual",
      title: `Manual trigger: ${trigger.outputType}`,
      status: "success",
      statusCode: 200,
      referenceId: workflowRunId,
      payload: {
        triggerId,
        sourceType: trigger.sourceType,
        outputType: trigger.outputType,
        workflowRunId,
        triggeredBy: auth.context.user.id,
      },
      retentionDays: logRetentionDays,
    });

    return NextResponse.json({
      success: true,
      workflowRunId,
      message: "Schedule triggered successfully",
    });
  } catch (error) {
    console.error("Error triggering schedule:", error);
    return NextResponse.json(
      { error: "Failed to trigger schedule" },
      { status: 500 },
    );
  }
}
