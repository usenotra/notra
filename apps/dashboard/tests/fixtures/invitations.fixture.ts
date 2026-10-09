import { beforeEach, expect, mock, test } from "bun:test";

import type { Invitation } from "@workos-inc/node";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { invitationActionSchema } from "../../src/schemas/invitation";

const recipient = {
  id: "local-recipient",
  email: "recipient@example.com",
  emailVerified: true,
  workosUserId: "user_recipient",
};
const pendingInvitation: Invitation = {
  object: "invitation",
  id: "invitation_fixture",
  email: recipient.email,
  state: "pending",
  acceptedAt: null,
  revokedAt: null,
  expiresAt: "2099-01-01T00:00:00.000Z",
  organizationId: "org_fixture",
  inviterUserId: "user_inviter",
  acceptedUserId: null,
  roleSlug: "admin",
  token: "fixture-token",
  acceptInvitationUrl:
    "http://localhost:3000/invitation?invitation_token=fixture-token",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const organization = {
  id: "local-organization",
  name: "Fixture team",
  slug: "fixture-team",
  logo: null,
};

let invitation = { ...pendingInvitation };
let identity: { user: typeof recipient } | null = { user: { ...recipient } };
let activeMembership = true;
const membership = {
  role: { slug: "member" },
  createdAt: "2026-01-01T00:00:00.000Z",
};
const findInvitationByToken = mock(async () => invitation);
const acceptInvitation = mock(async () => {
  invitation = {
    ...invitation,
    state: "accepted",
    acceptedUserId: recipient.workosUserId,
  };
  return invitation;
});
const revokeInvitation = mock(async () => undefined);
const listOrganizationMemberships = mock(async () => ({
  data: activeMembership ? [membership] : [],
}));
const listUsers = mock(async () => ({ data: [] }));
const upsertMembership = mock(async () => undefined);
const setCookie = mock();
const logError = mock();

mock.module("@notra/ai/utils/server-log", () => ({ logError }));
mock.module("@notra/db/drizzle", () => ({
  db: {
    query: {
      organizations: { findFirst: async () => organization },
      users: { findFirst: async () => ({ name: "Fixture inviter" }) },
    },
  },
}));
mock.module("@tanstack/react-start/server", () => ({ setCookie }));
mock.module("@workos/authkit-session", () => ({
  getWorkOS: () => ({
    userManagement: {
      findInvitationByToken,
      acceptInvitation,
      revokeInvitation,
      listOrganizationMemberships,
      listUsers,
    },
  }),
}));
mock.module("@/lib/auth/server", () => ({
  getAuthIdentity: async () => identity,
}));
mock.module("@/lib/auth/membership-upsert", () => ({ upsertMembership }));
globalThis.fetch = () => {
  throw new Error("Unexpected network request in invitation fixture");
};

const {
  acceptInvitationByToken,
  declineInvitationByToken,
  loadInvitationPage,
} = await import("../../src/lib/invitations/invitations");

beforeEach(() => {
  invitation = { ...pendingInvitation };
  identity = { user: { ...recipient } };
  activeMembership = true;
  mock.clearAllMocks();
});

test("Join retries the local write after WorkOS has accepted the invitation", async () => {
  upsertMembership.mockRejectedValueOnce(
    new Error("Transient database failure")
  );
  expect(await acceptInvitationByToken(invitation.token)).toEqual({
    ok: false,
    reason: "failed",
  });
  expect(invitation.state).toBe("accepted");
  expect(setCookie).not.toHaveBeenCalled();

  expect(await acceptInvitationByToken(invitation.token)).toEqual({
    ok: true,
    organizationSlug: organization.slug,
  });
  expect(acceptInvitation).toHaveBeenCalledTimes(1);
  expect(upsertMembership).toHaveBeenLastCalledWith({
    organizationId: organization.id,
    userId: recipient.id,
    role: membership.role.slug,
    createdAt: new Date(membership.createdAt),
  });
  expect(listOrganizationMemberships).toHaveBeenLastCalledWith({
    organizationId: invitation.organizationId,
    userId: recipient.workosUserId,
    statuses: ["active"],
    limit: 1,
  });
  expect(setCookie).toHaveBeenCalledTimes(1);
});

test("the original recipient can reload an accepted invitation to retry", async () => {
  await acceptInvitation();
  expect(await loadInvitationPage(invitation.token)).toMatchObject({
    status: "pending",
    viewer: { kind: "match" },
  });
});

test("an old accepted invitation cannot restore a removed membership", async () => {
  await acceptInvitation();
  activeMembership = false;
  expect(await acceptInvitationByToken(invitation.token)).toEqual({
    ok: false,
    reason: "unavailable",
  });
  expect(upsertMembership).not.toHaveBeenCalled();
  expect(setCookie).not.toHaveBeenCalled();
});

test("a replacement account with the same email cannot reuse an accepted invitation", async () => {
  await acceptInvitation();
  identity = { user: { ...recipient, workosUserId: "user_replacement" } };
  expect(await loadInvitationPage(invitation.token)).toEqual({
    status: "unavailable",
    reason: "accepted",
  });
  expect(await acceptInvitationByToken(invitation.token)).toEqual({
    ok: false,
    reason: "mismatch",
  });
  expect(upsertMembership).not.toHaveBeenCalled();
});

test("Join requires a signed-in recipient with a verified matching email", async () => {
  for (const user of [
    { ...recipient, email: "other@example.com" },
    { ...recipient, emailVerified: false },
  ]) {
    identity = { user };
    expect(await acceptInvitationByToken(invitation.token)).toEqual({
      ok: false,
      reason: "mismatch",
    });
  }
  identity = null;
  expect(await acceptInvitationByToken(invitation.token)).toEqual({
    ok: false,
    reason: "signed-out",
  });
  expect(acceptInvitation).not.toHaveBeenCalled();
  expect(upsertMembership).not.toHaveBeenCalled();
});

test("Decline revokes pending invitations and is idempotent only for revoked ones", async () => {
  expect(await declineInvitationByToken(invitation.token)).toEqual({
    ok: true,
    organizationSlug: null,
  });
  expect(revokeInvitation).toHaveBeenCalledTimes(1);
  invitation.state = "revoked";
  expect(await declineInvitationByToken(invitation.token)).toEqual({
    ok: true,
    organizationSlug: null,
  });
  expect(revokeInvitation).toHaveBeenCalledTimes(1);
});

test("Decline does not claim to withdraw accepted or expired invitations", async () => {
  for (const state of ["accepted", "expired"] as const) {
    invitation.state = state;
    expect(await declineInvitationByToken(invitation.token)).toEqual({
      ok: false,
      reason: "unavailable",
    });
  }
  invitation.state = "pending";
  invitation.expiresAt = "2000-01-01T00:00:00.000Z";
  expect(await declineInvitationByToken(invitation.token)).toEqual({
    ok: false,
    reason: "unavailable",
  });
  expect(revokeInvitation).not.toHaveBeenCalled();
});

test("signed-out authentication preserves the invitation token through signup", async () => {
  identity = null;
  const page = await loadInvitationPage(invitation.token);
  expect(page.status).toBe("pending");
  if (page.status !== "pending") {
    throw new Error("Expected a pending invitation");
  }
  const href = new URL(page.authHref, "http://localhost:3000");
  expect(href.pathname).toBe("/signup");
  expect(href.searchParams.get("returnTo")).toBe(
    `/invitation?invitation_token=${invitation.token}`
  );
});

test("invitation actions reject malformed tokens", () => {
  for (const input of [
    null,
    {},
    { token: 1 },
    { token: " " },
    { token: "x".repeat(4097) },
  ]) {
    expect(invitationActionSchema.safeParse(input).success).toBe(false);
  }
  expect(invitationActionSchema.parse({ token: "fixture-token" })).toEqual({
    token: "fixture-token",
  });
});

test("the avatar shape is opt-in and keeps circular avatars unchanged", async () => {
  const { Avatar, AvatarFallback } =
    await import("@notra/ui/components/ui/avatar");
  const circular = renderToStaticMarkup(createElement(Avatar));
  expect(circular).toContain('data-shape="circle"');
  expect(circular).toContain("rounded-full");
  const squircle = renderToStaticMarkup(
    createElement(
      Avatar,
      { shape: "squircle" },
      createElement(AvatarFallback, null, "FT")
    )
  );
  expect(squircle).toContain('data-shape="squircle"');
  expect(squircle).toContain("corner-squircle");
  expect(squircle).toContain("rounded-xl");
});
