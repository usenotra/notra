import type { getWorkspacesResponseSchema } from "@notra/schemas/api/workspaces";
import type { z } from "zod";

export type WorkspaceContext = z.infer<typeof getWorkspacesResponseSchema>;
export type WorkspaceMembership = WorkspaceContext["workspaces"][number];

export interface PendingWorkspaceInvitation {
  organizationId: string;
  role: string | null;
}
