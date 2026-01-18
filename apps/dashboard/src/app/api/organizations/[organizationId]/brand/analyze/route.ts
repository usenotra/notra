import { type NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { analyzeBrand } from "@/lib/workflows/brand-analysis";
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

    await start(analyzeBrand, [organizationId, url]);

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
