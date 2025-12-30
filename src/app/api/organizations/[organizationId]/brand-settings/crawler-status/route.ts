import { type NextRequest, NextResponse } from "next/server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { redis } from "@/lib/redis";

type CrawlerStep = {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "error";
  error?: string;
};

type CrawlerStatus = {
  status: "idle" | "crawling" | "completed" | "error";
  currentStep: string | null;
  steps: CrawlerStep[];
  error: string | null;
  workflowRunId: string | null;
};

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const statusKey = `brand-crawler:${organizationId}:status`;
    const statusData = await redis.get<CrawlerStatus>(statusKey);

    if (!statusData) {
      return NextResponse.json({
        status: "idle",
        currentStep: null,
        steps: [],
        error: null,
        workflowRunId: null,
      } satisfies CrawlerStatus);
    }

    return NextResponse.json(statusData);
  } catch (error) {
    console.error("Error fetching crawler status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
