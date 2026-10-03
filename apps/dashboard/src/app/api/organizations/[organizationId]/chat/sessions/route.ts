import { listChatSessions } from "@notra/ai/chat/history";

import { withOrganizationAuth } from "@/lib/auth/organization";

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { organizationId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const projectId = new URL(request.url).searchParams.get("projectId");
  const sessions = await listChatSessions(organizationId, { projectId });
  return Response.json({ sessions });
}
