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

const DEFAULT_ROLE = "member";

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
  if (reason) {
    return { status: "unavailable", reason };
  }

  const identity = await getAuthIdentity();
  let viewer: InvitationViewer = { kind: "signed-out" };
  if (identity) {
    viewer = sameEmail(identity.user.email, invitation.email)
      ? { kind: "match" }
      : { kind: "mismatch", email: identity.user.email };
  }

  const [inviterName, accountExists] = await Promise.all([
    findInviterName(invitation.inviterUserId),
    viewer.kind === "signed-out" ? hasAccount(invitation.email) : false,
  ]);

  return {
    status: "pending",
    token,
    email: invitation.email,
    role: invitation.roleSlug ?? DEFAULT_ROLE,
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

/** Joins the signed-in user to the organization the invitation belongs to. */
export async function acceptInvitationByToken(
  token: string
): Promise<InvitationActionResult> {
  const identity = await getAuthIdentity();
  if (!identity) {
    return { ok: false, reason: "signed-out" };
  }

  const invitation = await findInvitation(token);
  const organization = invitation
    ? await findOrganization(invitation.organizationId)
    : null;
  if (!(invitation && organization) || unavailableReason(invitation)) {
    return { ok: false, reason: "unavailable" };
  }
  if (!sameEmail(identity.user.email, invitation.email)) {
    return { ok: false, reason: "mismatch" };
  }

  try {
    await getWorkOS().userManagement.acceptInvitation(invitation.id);
    // The WorkOS webhook also syncs this row; writing it now makes the
    // dashboard open on the new organization without waiting for it.
    await upsertMembership({
      organizationId: organization.id,
      userId: identity.user.id,
      role: invitation.roleSlug ?? DEFAULT_ROLE,
      createdAt: new Date(),
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
  if (unavailableReason(invitation)) {
    return { ok: true, organizationSlug: null };
  }

  try {
    await getWorkOS().userManagement.revokeInvitation(invitation.id);
  } catch (error) {
    logError("Failed to decline invitation", error);
    return { ok: false, reason: "failed" };
  }
  return { ok: true, organizationSlug: null };
}
