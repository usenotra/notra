import { type NextRequest, NextResponse } from "next/server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import type {
  IntegrationType,
  Log,
  LogDirection,
  LogsResponse,
  WebhookLogStatus,
} from "@/types/webhook-logs";

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

const EVENT_TITLES = [
  "Push to main branch",
  "Pull request opened",
  "Issue created",
  "Issue updated",
  "Release published",
  "Workflow completed",
  "Deployment created",
  "Commit pushed",
  "Message received",
  "Channel notification",
  "Task created",
  "Task completed",
] as const;

const INTEGRATION_TYPES: IntegrationType[] = [
  "github",
  "linear",
  "slack",
  "webhook",
];

const DIRECTIONS: LogDirection[] = ["incoming", "outgoing"];

const STATUSES: WebhookLogStatus[] = ["success", "failed", "pending"];

function getStatusCode(status: WebhookLogStatus): number | null {
  if (status === "pending") {
    return null;
  }
  return status === "success" ? 200 : 500;
}

function generateReferenceId(integrationType: IntegrationType): string | null {
  const random = Math.floor(Math.random() * 10_000);
  switch (integrationType) {
    case "github":
      return `PR-${random}`;
    case "linear":
      return `LIN-${random}`;
    case "slack":
      return `MSG-${random}`;
    default:
      return null;
  }
}

function generateExampleLogs(count: number): Log[] {
  const logs: Log[] = [];

  for (let i = 0; i < count; i++) {
    const status =
      STATUSES[Math.floor(Math.random() * STATUSES.length)] ?? "pending";
    const title =
      EVENT_TITLES[Math.floor(Math.random() * EVENT_TITLES.length)] ??
      "Webhook event";
    const integrationType =
      INTEGRATION_TYPES[Math.floor(Math.random() * INTEGRATION_TYPES.length)] ??
      "webhook";
    const direction =
      DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)] ?? "incoming";

    const createdAt = new Date(
      Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
    );

    logs.push({
      id: `log_${crypto.randomUUID().slice(0, 8)}`,
      referenceId: generateReferenceId(integrationType),
      title,
      integrationType,
      direction,
      status,
      statusCode: getStatusCode(status),
      errorMessage:
        status === "failed"
          ? "Connection timeout: Failed to establish connection"
          : null,
      createdAt: createdAt.toISOString(),
    });
  }

  return logs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10),
    );
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("pageSize") || "10", 10)),
    );

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedLogs = ALL_LOGS.slice(startIndex, endIndex);

    const response: LogsResponse = {
      logs: paginatedLogs,
      pagination: {
        page,
        pageSize,
        totalCount: TOTAL_LOGS,
        totalPages: Math.ceil(TOTAL_LOGS / pageSize),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching webhook logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
