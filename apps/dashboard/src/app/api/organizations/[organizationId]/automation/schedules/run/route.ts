import { withOrganizationAuth } from "@/lib/auth/organization";
import { db } from "@notra/db/drizzle";
import { contentTriggers } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { triggerScheduleNow } from "@/lib/triggers/qstash";

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

    const workflowRunId = await triggerScheduleNow(triggerId);

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
