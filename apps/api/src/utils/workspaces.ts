import type { createDb } from "@notra/db/drizzle";
import { members, organizations, users } from "@notra/db/schema";
import { eq, inArray } from "drizzle-orm";

import { WorkspaceInvitationServiceError } from "../errors/workspaces";
import type { WorkspaceAuthData } from "../types/auth";
import { isOAuthAuth } from "../types/auth";
import type {
  PendingWorkspaceInvitation,
  WorkspaceContext,
  WorkspaceMembership,
} from "../types/workspaces";
import { getOrganizationResponse } from "./organizations";

type DbClient = ReturnType<typeof createDb>;
type PendingInvitationLoader = (
  email: string
) => Promise<PendingWorkspaceInvitation[]>;

function toWorkspaceMembership(
  organization: WorkspaceContext["currentWorkspace"],
  role: string | null,
  isCurrent: boolean
): WorkspaceMembership {
  return {
    ...organization,
    role,
    status: "active",
    isCurrent,
  };
}

export async function getWorkspaceContext(
  db: DbClient,
  auth: WorkspaceAuthData,
  currentWorkspaceId: string,
  loadPendingInvitations?: PendingInvitationLoader
): Promise<WorkspaceContext | null> {
  const currentWorkspace = await getOrganizationResponse(
    db,
    currentWorkspaceId
  );
  if (!currentWorkspace) {
    return null;
  }

  if (!isOAuthAuth(auth)) {
    return {
      currentWorkspace,
      workspaces: [toWorkspaceMembership(currentWorkspace, null, true)],
      authentication: { type: "apiKey" },
    };
  }

  const membershipRows = await db.query.members.findMany({
    where: eq(members.userId, auth.userId),
    columns: { role: true },
    with: {
      organizations: {
        columns: { id: true, slug: true, name: true, logo: true },
      },
    },
  });

  const workspaces = membershipRows.flatMap((membership) => {
    if (!membership.organizations) {
      return [];
    }

    return [
      toWorkspaceMembership(
        membership.organizations,
        membership.role,
        membership.organizations.id === currentWorkspaceId
      ),
    ];
  });

  if (!workspaces.some((workspace) => workspace.isCurrent)) {
    workspaces.unshift(toWorkspaceMembership(currentWorkspace, null, true));
  }

  if (loadPendingInvitations) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, auth.userId),
      columns: { email: true },
    });
    if (!user) {
      return null;
    }

    const invitations = await loadPendingInvitations(user.email).catch(
      (cause) => {
        throw new WorkspaceInvitationServiceError(cause);
      }
    );
    const activeWorkspaceIds = new Set(
      workspaces.map((workspace) => workspace.id)
    );
    const roleByWorkosOrganizationId = new Map<string, string | null>();

    for (const invitation of invitations) {
      if (!roleByWorkosOrganizationId.has(invitation.organizationId)) {
        roleByWorkosOrganizationId.set(
          invitation.organizationId,
          invitation.role
        );
      }
    }

    if (roleByWorkosOrganizationId.size > 0) {
      const pendingOrganizations = await db.query.organizations.findMany({
        where: inArray(organizations.workosOrgId, [
          ...roleByWorkosOrganizationId.keys(),
        ]),
        columns: {
          id: true,
          slug: true,
          name: true,
          logo: true,
          workosOrgId: true,
        },
      });

      for (const organization of pendingOrganizations) {
        if (
          activeWorkspaceIds.has(organization.id) ||
          !organization.workosOrgId ||
          !roleByWorkosOrganizationId.has(organization.workosOrgId)
        ) {
          continue;
        }

        workspaces.push({
          id: organization.id,
          slug: organization.slug,
          name: organization.name,
          logo: organization.logo,
          role:
            roleByWorkosOrganizationId.get(organization.workosOrgId) ?? null,
          status: "pending",
          isCurrent: false,
        });
      }
    }
  }

  workspaces.sort((left, right) => {
    if (left.isCurrent !== right.isCurrent) {
      return Number(right.isCurrent) - Number(left.isCurrent);
    }
    if (left.status !== right.status) {
      return left.status === "active" ? -1 : 1;
    }
    return (
      left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
    );
  });

  return {
    currentWorkspace,
    workspaces,
    authentication: {
      type: "oauth",
      accountId: auth.userId,
      scopes: auth.scopes,
    },
  };
}
