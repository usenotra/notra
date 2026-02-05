import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { listWebhookLogs } from "@/lib/webhooks/logging";
import type { Log, LogsResponse } from "@/types/webhook-logs";

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

const PAGE_SIZE_DEFAULT = 10;

function paginateLogs(logs: Log[], page: number, pageSize: number) {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return logs.slice(startIndex, endIndex);
}

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
      Number.parseInt(searchParams.get("page") || "1", 10)
    );
    const pageSize = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(
          searchParams.get("pageSize") || `${PAGE_SIZE_DEFAULT}`,
          10
        )
      )
    );

    const integrationType = searchParams.get("integrationType") || "github";
    const integrationId = searchParams.get("integrationId");

    const logs = await listWebhookLogs(
      organizationId,
      integrationType as Log["integrationType"],
      integrationId === "all" ? null : integrationId
    );

    const paginatedLogs = paginateLogs(logs, page, pageSize);

    const response: LogsResponse = {
      logs: paginatedLogs,
      pagination: {
        page,
        pageSize,
        totalCount: logs.length,
        totalPages: Math.max(1, Math.ceil(logs.length / pageSize)),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching webhook logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
