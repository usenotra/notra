import { type NextRequest, NextResponse } from "next/server";
import { Client as WorkflowClient } from "@upstash/workflow";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { analyzeBrandSchema } from "@/utils/schemas/brand";

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
    const validationResult = analyzeBrandSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { url } = validationResult.data;

    const client = new WorkflowClient({ token: process.env.QSTASH_TOKEN! });

    await client.trigger({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/workflows/brand-analysis`,
      body: { organizationId, url },
    });

    return NextResponse.json({
      success: true,
      message: "Brand analysis started",
    });
  } catch (error) {
    console.error("Error starting brand analysis:", error);
    return NextResponse.json(
      { error: "Failed to start brand analysis" },
      { status: 500 }
    );
  }
}
