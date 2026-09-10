import { listChatSessions } from "@notra/ai/chat/history";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { withOrganizationAuth } from "@/lib/auth/organization";

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { organizationId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  const sessions = await listChatSessions(organizationId, { projectId });
  return NextResponse.json({ sessions });
}
