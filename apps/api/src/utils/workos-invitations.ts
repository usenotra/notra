import { WorkOS } from "@workos-inc/node";

import type { PendingWorkspaceInvitation } from "../types/workspaces";

export async function listPendingWorkspaceInvitations(
  apiKey: string,
  email: string
): Promise<PendingWorkspaceInvitation[]> {
  const workos = new WorkOS(apiKey);
  const invitations = await workos.userManagement
    .listInvitations({ email })
    .then((page) => page.autoPagination());

  return invitations.flatMap((invitation) => {
    if (!(invitation.state === "pending" && invitation.organizationId)) {
      return [];
    }

    return [
      {
        organizationId: invitation.organizationId,
        role: invitation.roleSlug,
      },
    ];
  });
}
