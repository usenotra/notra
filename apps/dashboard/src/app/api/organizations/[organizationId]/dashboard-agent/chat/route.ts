import { listChatSessions } from "@notra/ai/chat/history";

import { withOrganizationAuth } from "@/lib/auth/organization";
import type { RouteContext } from "@/types/api/routes";

export { POST } from "../../chat/route";

export async function GET(
  request: Request,
  { params }: RouteContext<{ organizationId: string }>
) {
  const { organizationId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);

  if (!auth.success) {
    return auth.response;
  }

  const projectId = new URL(request.url).searchParams.get("projectId");
  const sessions = await listChatSessions(organizationId, { projectId });
  return Response.json({ sessions });
}
