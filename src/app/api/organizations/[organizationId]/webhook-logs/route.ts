import { type NextRequest, NextResponse } from "next/server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import type {
  WebhookLog,
  WebhookLogStatus,
  WebhookLogsResponse,
} from "@/types/webhook-logs";

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

const EVENT_TYPES = [
  "push",
  "pull_request",
  "issue.created",
  "issue.updated",
  "release.published",
  "workflow_run.completed",
  "deployment.created",
  "commit.pushed",
] as const;

const SOURCES = ["github", "linear", "slack"] as const;

const STATUSES: WebhookLogStatus[] = ["success", "failed", "pending"];

function generateExampleLogs(count: number): WebhookLog[] {
  const logs: WebhookLog[] = [];

  for (let i = 0; i < count; i++) {
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const eventType =
      EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];

    const createdAt = new Date(
      Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
    );

    logs.push({
      id: `log_${crypto.randomUUID().slice(0, 8)}`,
      eventType,
      source,
      status,
      statusCode: status === "pending" ? null : status === "success" ? 200 : 500,
      requestUrl: `https://api.example.com/webhooks/${source}`,
      requestMethod: "POST",
      responseTime:
        status === "pending" ? null : Math.floor(Math.random() * 500) + 50,
      errorMessage:
        status === "failed"
          ? "Connection timeout: Failed to establish connection"
          : null,
      createdAt: createdAt.toISOString(),
    });
  }

  return logs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

const TOTAL_LOGS = 57;
const ALL_LOGS = generateExampleLogs(TOTAL_LOGS);

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("pageSize") || "10"))
    );

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedLogs = ALL_LOGS.slice(startIndex, endIndex);

    const response: WebhookLogsResponse = {
      logs: paginatedLogs,
      pagination: {
        page,
        pageSize,
        totalCount: TOTAL_LOGS,
        totalPages: Math.ceil(TOTAL_LOGS / pageSize),
      },
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
