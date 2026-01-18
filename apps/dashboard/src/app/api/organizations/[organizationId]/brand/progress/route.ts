import { type NextRequest, NextResponse } from "next/server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { redis } from "@/lib/redis";

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

interface ProgressData {
  status:
    | "idle"
    | "scraping"
    | "extracting"
    | "saving"
    | "completed"
    | "failed";
  currentStep: number;
  totalSteps: number;
  error?: string;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const progress = await redis.get<ProgressData>(
      `brand:progress:${organizationId}`
    );

    if (!progress) {
      return NextResponse.json({
        progress: {
          status: "idle",
          currentStep: 0,
          totalSteps: 3,
        } satisfies ProgressData,
      });
    }

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("Error fetching brand progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}
