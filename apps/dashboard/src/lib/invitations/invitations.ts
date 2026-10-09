import { logError } from "@notra/ai/utils/server-log";
import { db } from "@notra/db/drizzle";
import { organizations, users } from "@notra/db/schema";
import { setCookie } from "@tanstack/react-start/server";
import type { Invitation } from "@workos-inc/node";
import { getWorkOS } from "@workos/authkit-session";
import { eq } from "drizzle-orm";

import {
  LAST_VISITED_ORGANIZATION_COOKIE,
  LAST_VISITED_ORGANIZATION_COOKIE_MAX_AGE,
} from "@/constants/cookies";
import { upsertMembership } from "@/lib/auth/membership-upsert";
import { getAuthIdentity } from "@/lib/auth/server";
import { isWorkOSNotFound } from "@/lib/auth/workos-error";
import type {
  InvitationActionResult,
  InvitationPageData,
  InvitationUnavailableReason,
  InvitationViewer,
} from "@/types/invitation";

async function findInvitation(token: string): Promise<Invitation | null> {
  try {
    return await getWorkOS().userManagement.findInvitationByToken(token);
  } catch (error) {
    if (isWorkOSNotFound(error)) {
      return null;
    }
    throw error;
  }
}

function unavailableReason(
  invitation: Invitation
): InvitationUnavailableReason | null {
  if (invitation.state === "accepted") {
    return "accepted";
  }
  if (invitation.state === "revoked") {
    return "revoked";
  }
  if (
    invitation.state === "expired" ||
    new Date(invitation.expiresAt).getTime() <= Date.now()
  ) {
    return "expired";
  }
  return null;
}

function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

async function findOrganization(workosOrgId: string | null) {
  if (!workosOrgId) {
    return null;
  }
  return (
    (await db.query.organizations.findFirst({
      where: eq(organizations.workosOrgId, workosOrgId),
      columns: { id: true, name: true, slug: true, logo: true },
    })) ?? null
  );
}

async function findInviterName(
  workosUserId: string | null
): Promise<string | null> {
  if (!workosUserId) {
    return null;
  }
  const inviter = await db.query.users.findFirst({
    where: eq(users.workosUserId, workosUserId),
    columns: { name: true },
  });
  return inviter?.name?.trim() || null;
}

async function hasAccount(email: string): Promise<boolean> {
  const page = await getWorkOS().userManagement.listUsers({ email, limit: 1 });
  return page.data.length > 0;
}

function buildAuthHref(token: string, accountExists: boolean): string {
  const returnTo = `/invitation?${new URLSearchParams({ invitation_token: token })}`;
  const path = accountExists ? "/login" : "/signup";
  return `${path}?${new URLSearchParams({ returnTo })}`;
}

export async function loadInvitationPage(
  token: string | undefined
): Promise<InvitationPageData> {
  if (!token) {
    return { status: "unavailable", reason: "missing" };
  }

  const invitation = await findInvitation(token);
  const organization = invitation
    ? await findOrganization(invitation.organizationId)
    : null;
  if (!(invitation && organization)) {
    return { status: "unavailable", reason: "not-found" };
  }

  const reason = unavailableReason(invitation);
  if (reason && reason !== "accepted") {
    return { status: "unavailable", reason };
  }

  const identity = await getAuthIdentity();
  let viewer: InvitationViewer = { kind: "signed-out" };
  if (identity) {
    viewer = sameEmail(identity.user.email, invitation.email)
      ? { kind: "match" }
      : { kind: "mismatch", email: identity.user.email };
  }
  if (
    reason === "accepted" &&
    (viewer.kind !== "match" ||
      !invitation.acceptedUserId ||
      invitation.acceptedUserId !== identity?.user.workosUserId)
  ) {
    return { status: "unavailable", reason };
  }

  const [inviterName, accountExists] = await Promise.all([
    findInviterName(invitation.inviterUserId),
    viewer.kind === "signed-out" ? hasAccount(invitation.email) : false,
  ]);

  return {
    status: "pending",
    token,
    email: invitation.email,
    role: invitation.roleSlug ?? "member",
    organization: {
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
    },
    inviterName,
    viewer,
    authHref: buildAuthHref(token, accountExists),
  };
}

export async function acceptInvitationByToken(
  token: string
): Promise<InvitationActionResult> {
  const identity = await getAuthIdentity();
  if (!identity) {
    return { ok: false, reason: "signed-out" };
  }
  if (!(identity.user.workosUserId && identity.user.emailVerified)) {
    return { ok: false, reason: "mismatch" };
  }

  const invitation = await findInvitation(token);
  const organization = invitation
    ? await findOrganization(invitation.organizationId)
    : null;
  if (
    !(invitation?.organizationId && organization) ||
    (invitation.state !== "accepted" && unavailableReason(invitation))
  ) {
    return { ok: false, reason: "unavailable" };
  }
  if (!sameEmail(identity.user.email, invitation.email)) {
    return { ok: false, reason: "mismatch" };
  }

  try {
    const accepted =
      invitation.state === "accepted"
        ? invitation
        : await getWorkOS().userManagement.acceptInvitation(invitation.id);
    if (accepted.acceptedUserId !== identity.user.workosUserId) {
      return { ok: false, reason: "mismatch" };
    }
    // Reconcile current access, not the old invitation's role: a retry must
    // never re-add a removed member or undo a role change.
    const memberships =
      await getWorkOS().userManagement.listOrganizationMemberships({
        organizationId: invitation.organizationId,
        userId: identity.user.workosUserId,
        statuses: ["active"],
        limit: 1,
      });
    const membership = memberships.data[0];
    if (!membership) {
      return { ok: false, reason: "unavailable" };
    }
    await upsertMembership({
      organizationId: organization.id,
      userId: identity.user.id,
      role: membership.role.slug,
      createdAt: new Date(membership.createdAt),
    });
  } catch (error) {
    logError("Failed to accept invitation", error);
    return { ok: false, reason: "failed" };
  }

  setCookie(LAST_VISITED_ORGANIZATION_COOKIE, organization.slug, {
    path: "/",
    maxAge: LAST_VISITED_ORGANIZATION_COOKIE_MAX_AGE,
  });
  return { ok: true, organizationSlug: organization.slug };
}

/** Declining revokes the invitation, so it leaves the sender's pending list. */
export async function declineInvitationByToken(
  token: string
): Promise<InvitationActionResult> {
  const invitation = await findInvitation(token);
  if (!invitation) {
    return { ok: false, reason: "unavailable" };
  }
  if (invitation.state === "revoked") {
    return { ok: true, organizationSlug: null };
  }
  if (unavailableReason(invitation)) {
    return { ok: false, reason: "unavailable" };
  }

  try {
    await getWorkOS().userManagement.revokeInvitation(invitation.id);
  } catch (error) {
    logError("Failed to decline invitation", error);
    return { ok: false, reason: "failed" };
  }
  return { ok: true, organizationSlug: null };
}
