import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
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

export async function GET(request: NextRequest) {
  try {
    const { session, user } = await getServerSession({
      headers: request.headers,
    });

    if (!(user && session?.activeOrganizationId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }
    if (organizationId !== session.activeOrganizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
