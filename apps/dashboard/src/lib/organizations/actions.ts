"use server";

import { autumn } from "@notra/ai/billing/autumn";
import { checkTeamMembersLimit } from "@notra/ai/billing/team-members";
import {
  TEAM_MEMBER_LIMIT_CHECK_UNAVAILABLE_MESSAGE,
  TEAM_MEMBER_LIMIT_ERROR_MESSAGE,
} from "@notra/ai/constants/billing-limits";
import { seedSystemSkills } from "@notra/ai/skills/seed";
import { db } from "@notra/db/drizzle";
import { members, organizations, users } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { organizationSlugParamSchema } from "@notra/schemas/dashboard/auth/organization";
import {
  createOrganizationInputSchema,
  invitationActionInputSchema,
  inviteMemberInputSchema,
  organizationLookupQueryInputSchema,
  organizationScopedQueryInputSchema,
  removeMemberInputSchema,
  setActiveOrganizationInputSchema,
  updateMemberRoleInputSchema,
  updateOrganizationInputSchema,
} from "@notra/schemas/dashboard/organizations/actions";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import type { Invitation } from "@workos-inc/node";
import { and, count, desc, eq } from "drizzle-orm";
import { Effect } from "effect";
import { isValid as isNotDisposableEmail } from "mailchecker";
import { cookies } from "next/headers";

import { QUOTA_FEATURES } from "@/constants/analytics-events";
import {
  LAST_VISITED_ORGANIZATION_COOKIE,
  LAST_VISITED_ORGANIZATION_COOKIE_MAX_AGE,
} from "@/constants/cookies";
import {
  identifyOrganizationGroup,
  trackServerEvent,
} from "@/lib/analytics/posthog-server";
import { readRequestHeaders } from "@/lib/analytics/request-headers";
import { readWorkOSError } from "@/lib/auth/workos-error";
import { OrganizationActionError } from "@/lib/organizations/errors";
import {
  requireManagerMembership,
  requireMembership,
  requireSession,
  resolveOrganizationId,
} from "@/lib/organizations/guards";
import { runOrganizationAction } from "@/lib/organizations/run-action";
import { validateActionInput } from "@/lib/organizations/validate-input";
import {
  ensureWorkOSOrganizationWithMembers,
  removeMembershipFromWorkOS,
  syncOrganizationNameToWorkOS,
  updateMembershipRoleInWorkOS,
} from "@/lib/organizations/workos-sync";
import type {
  ActionResult,
  CreateOrganizationInput,
  FullOrganization,
  InvitationActionInput,
  InvitationSummary,
  InviteMemberInput,
  ListMembersInput,
  MembersListResult,
  MemberWithUser,
  OrganizationRow,
  RemoveMemberInput,
  SetActiveOrganizationInput,
  UpdateMemberRoleInput,
  UpdateOrganizationInput,
} from "@/types/organizations/actions";
import type { OrganizationTrackingInput } from "@/types/organizations/analytics";

const enforceTeamMembersLimit = Effect.fn(
  "organizations.actions.enforceTeamMembersLimit"
)(function* (organizationId: string) {
  const status = yield* Effect.tryPromise({
    try: () => checkTeamMembersLimit(organizationId),
    catch: (cause) =>
      new OrganizationActionError({
        message: TEAM_MEMBER_LIMIT_CHECK_UNAVAILABLE_MESSAGE,
        cause,
      }),
  });

  if (status === "check-unavailable") {
    return yield* Effect.fail(
      new OrganizationActionError({
        message: TEAM_MEMBER_LIMIT_CHECK_UNAVAILABLE_MESSAGE,
      })
    );
  }

  if (status === "limit-reached") {
    return yield* Effect.fail(
      new OrganizationActionError({ message: TEAM_MEMBER_LIMIT_ERROR_MESSAGE })
    );
  }
});

const tryDb = <T>(run: () => Promise<T>, message: string) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new OrganizationActionError({ message, cause }),
  });

const trackOrganizationEvent = Effect.fn(
  "organizations.actions.trackOrganizationEvent"
)(function* (input: OrganizationTrackingInput) {
  const requestHeaders = yield* Effect.promise(readRequestHeaders);
  yield* Effect.sync(() => {
    trackServerEvent({
      event: input.event,
      headers: requestHeaders,
      userId: input.userId,
      organizationId: input.organizationId,
      properties: input.properties,
    });
  });
});

const countOrganizationMembers = Effect.fn(
  "organizations.actions.countOrganizationMembers"
)(function* (organizationId: string) {
  return yield* Effect.tryPromise({
    try: async () => {
      const [row] = await db
        .select({ value: count() })
        .from(members)
        .where(eq(members.organizationId, organizationId));
      return row?.value ?? null;
    },
    catch: () => null,
  }).pipe(Effect.catch(() => Effect.succeed(null)));
});

const mapMemberRows = (
  rows: Array<{
    id: string;
    organizationId: string;
    userId: string;
    role: string;
    createdAt: Date;
    users: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    } | null;
  }>
): MemberWithUser[] =>
  rows.flatMap((row) => {
    if (!row.users) {
      return [];
    }

    return [
      {
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId,
        role: row.role,
        createdAt: row.createdAt,
        user: row.users,
      },
    ];
  });

const tryWorkOS = <T>(run: () => Promise<T>, fallbackMessage: string) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new OrganizationActionError({
        message: readWorkOSError(cause).message || fallbackMessage,
        cause,
      }),
  });

const mapInvitation = (invitation: Invitation): InvitationSummary => ({
  id: invitation.id,
  email: invitation.email,
  role: invitation.roleSlug,
  status: invitation.state,
  expiresAt: new Date(invitation.expiresAt),
  createdAt: new Date(invitation.createdAt),
  acceptInvitationUrl: invitation.acceptInvitationUrl,
});

const requireWorkOSOrganizationId = Effect.fn(
  "organizations.actions.requireWorkOSOrganizationId"
)(function* (organizationId: string) {
  return yield* ensureWorkOSOrganizationWithMembers(organizationId).pipe(
    Effect.catch((error) =>
      Effect.fail(
        new OrganizationActionError({
          message: "This organization is not linked to WorkOS yet",
          cause: error,
        })
      )
    )
  );
});

const requireInvitationManagement = Effect.fn(
  "organizations.actions.requireInvitationManagement"
)(function* (invitationId: string) {
  const session = yield* requireSession();

  const invitation = yield* tryWorkOS(
    () => getWorkOS().userManagement.getInvitation(invitationId),
    "Failed to load invitation"
  );

  if (!invitation.organizationId) {
    return yield* Effect.fail(
      new OrganizationActionError({ message: "Invitation not found" })
    );
  }

  const organization = yield* tryDb(
    () =>
      db.query.organizations.findFirst({
        where: eq(organizations.workosOrgId, invitation.organizationId ?? ""),
        columns: { id: true },
      }),
    "Failed to load organization"
  );

  if (!organization) {
    return yield* Effect.fail(
      new OrganizationActionError({ message: "Organization not found" })
    );
  }

  yield* requireManagerMembership(session, organization.id);
  return {
    invitation,
    organizationId: organization.id,
    userId: session.user.id,
  };
});

export async function createOrganizationAction(
  rawInput: CreateOrganizationInput
): Promise<ActionResult<OrganizationRow>> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();
      const input = yield* validateActionInput(
        createOrganizationInputSchema,
        rawInput
      );
      const { slug } = input;

      const existing = yield* tryDb(
        () =>
          db.query.organizations.findFirst({
            where: eq(organizations.slug, slug),
            columns: { id: true },
          }),
        "Failed to check organization slug"
      );

      if (existing) {
        return yield* Effect.fail(
          new OrganizationActionError({
            message: "An organization with this slug already exists",
          })
        );
      }

      const organizationId = crypto.randomUUID();
      const now = new Date();

      const [organization] = yield* tryDb(
        () =>
          db.transaction(async (tx) => {
            const inserted = await tx
              .insert(organizations)
              .values({
                id: organizationId,
                name: input.name,
                slug,
                logo: input.logo ?? null,
                createdAt: now,
              })
              .returning();

            await tx.insert(members).values({
              id: crypto.randomUUID(),
              organizationId,
              userId: session.user.id,
              role: "owner",
              createdAt: now,
            });

            return inserted;
          }),
        "Failed to create organization"
      );

      if (!organization) {
        return yield* Effect.fail(
          new OrganizationActionError({
            message: "Organization creation returned no row",
          })
        );
      }

      yield* ensureWorkOSOrganizationWithMembers(organizationId).pipe(
        Effect.catch((error) =>
          tryDb(
            () =>
              db
                .delete(organizations)
                .where(eq(organizations.id, organizationId)),
            "Failed to roll back organization"
          ).pipe(
            Effect.andThen(
              Effect.fail(
                new OrganizationActionError({
                  message: "Failed to link organization to WorkOS",
                  cause: error,
                })
              )
            )
          )
        )
      );

      yield* Effect.tryPromise({
        try: () => seedSystemSkills(organizationId),
        catch: (cause) =>
          new OrganizationActionError({
            message: "Failed to seed system skills",
            cause,
          }),
      }).pipe(
        Effect.catch((error) =>
          Effect.logWarning("Failed to seed system skills for new org").pipe(
            Effect.annotateLogs({ organizationId, error: error.message })
          )
        )
      );

      const autumnClient = autumn;
      if (autumnClient) {
        yield* Effect.tryPromise({
          try: () =>
            autumnClient.customers.getOrCreate({
              customerId: organizationId,
              name: input.name,
              metadata: { orgId: organizationId },
            }),
          catch: (cause) =>
            new OrganizationActionError({
              message: "Failed to create billing customer",
              cause,
            }),
        }).pipe(
          Effect.catch((error) =>
            Effect.logWarning("Failed to create Autumn customer").pipe(
              Effect.annotateLogs({ organizationId, error: error.message })
            )
          )
        );
      }

      yield* trackOrganizationEvent({
        event: POSTHOG_EVENTS.WORKSPACE_CREATED,
        userId: session.user.id,
        organizationId,
        properties: { has_logo: Boolean(input.logo) },
      });
      yield* Effect.sync(() => {
        identifyOrganizationGroup({
          organizationId,
          userId: session.user.id,
          properties: {
            name: input.name,
            slug,
            created_at: now.toISOString(),
          },
        });
      });

      if (!input.keepCurrentActiveOrganization) {
        const cookieStore = yield* tryDb(
          () => cookies(),
          "Failed to access cookies"
        );
        cookieStore.set(LAST_VISITED_ORGANIZATION_COOKIE, slug, {
          path: "/",
          maxAge: LAST_VISITED_ORGANIZATION_COOKIE_MAX_AGE,
        });
      }

      return organization;
    })
  );
}

export async function updateOrganizationAction(
  rawInput: UpdateOrganizationInput
): Promise<ActionResult<OrganizationRow>> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();
      const input = yield* validateActionInput(
        updateOrganizationInputSchema,
        rawInput
      );
      yield* requireManagerMembership(session, input.organizationId);

      const updates: Partial<{
        name: string;
        slug: string;
        logo: string | null;
      }> = {};

      if (input.data.name !== undefined) {
        updates.name = input.data.name;
      }

      if (input.data.logo !== undefined) {
        updates.logo = input.data.logo;
      }

      if (input.data.slug !== undefined) {
        updates.slug = input.data.slug;
      }

      const [organization] = yield* tryDb(
        () =>
          db
            .update(organizations)
            .set(updates)
            .where(eq(organizations.id, input.organizationId))
            .returning(),
        "Failed to update organization"
      );

      if (!organization) {
        return yield* Effect.fail(
          new OrganizationActionError({ message: "Organization not found" })
        );
      }

      if (updates.name !== undefined) {
        yield* syncOrganizationNameToWorkOS(input.organizationId, updates.name);
      }

      if (updates.name !== undefined || updates.slug !== undefined) {
        yield* Effect.sync(() => {
          identifyOrganizationGroup({
            organizationId: input.organizationId,
            userId: session.user.id,
            properties: { name: organization.name, slug: organization.slug },
          });
        });
      }

      if (updates.slug) {
        const cookieStore = yield* tryDb(
          () => cookies(),
          "Failed to access cookies"
        );

        if (
          cookieStore.get(LAST_VISITED_ORGANIZATION_COOKIE)?.value !==
          organization.slug
        ) {
          cookieStore.set(LAST_VISITED_ORGANIZATION_COOKIE, organization.slug, {
            path: "/",
            maxAge: LAST_VISITED_ORGANIZATION_COOKIE_MAX_AGE,
          });
        }
      }

      return organization;
    })
  );
}

export async function listOrganizationsAction(): Promise<
  ActionResult<OrganizationRow[]>
> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();

      const rows = yield* tryDb(
        () =>
          db.query.members.findMany({
            where: eq(members.userId, session.user.id),
            orderBy: [desc(members.createdAt)],
            with: { organizations: true },
          }),
        "Failed to list organizations"
      );

      return rows.flatMap((row) =>
        row.organizations ? [row.organizations] : []
      );
    })
  );
}

function findOrganizationForSelection(input: SetActiveOrganizationInput) {
  if (input.organizationId) {
    return db.query.organizations.findFirst({
      where: eq(organizations.id, input.organizationId),
    });
  }

  if (input.organizationSlug) {
    return db.query.organizations.findFirst({
      where: eq(organizations.slug, input.organizationSlug),
    });
  }

  return Promise.resolve(undefined);
}

export async function setActiveOrganizationAction(
  rawInput: SetActiveOrganizationInput
): Promise<ActionResult<OrganizationRow>> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();
      const input = yield* validateActionInput(
        setActiveOrganizationInputSchema,
        rawInput
      );

      const organization = yield* tryDb(
        () => findOrganizationForSelection(input),
        "Failed to load organization"
      );

      if (!organization) {
        return yield* Effect.fail(
          new OrganizationActionError({ message: "Organization not found" })
        );
      }

      yield* requireMembership(session, organization.id);

      const cookieStore = yield* tryDb(
        () => cookies(),
        "Failed to access cookies"
      );
      cookieStore.set(LAST_VISITED_ORGANIZATION_COOKIE, organization.slug, {
        path: "/",
        maxAge: LAST_VISITED_ORGANIZATION_COOKIE_MAX_AGE,
      });

      return organization;
    })
  );
}

/**
 * Organization row for a `/[slug]` route, without the member join. Unlike
 * `validateOrganizationAccess` this never redirects, so it is safe to call from
 * a client query.
 */
export async function getOrganizationSummaryAction(
  rawSlug: string
): Promise<ActionResult<OrganizationRow>> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();
      const slug = yield* validateActionInput(
        organizationSlugParamSchema,
        rawSlug
      );

      const organization = yield* tryDb(
        () =>
          db.query.organizations.findFirst({
            where: eq(organizations.slug, slug),
          }),
        "Failed to load organization"
      );

      if (!organization) {
        return yield* Effect.fail(
          new OrganizationActionError({ message: "Organization not found" })
        );
      }

      yield* requireMembership(session, organization.id);

      return organization;
    })
  );
}

export async function getFullOrganizationAction(rawInput?: {
  query?: { organizationId?: string; organizationSlug?: string };
}): Promise<ActionResult<FullOrganization | null>> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();
      const input = yield* validateActionInput(
        organizationLookupQueryInputSchema,
        rawInput
      );

      let organizationId = input?.query?.organizationId;

      if (!organizationId && input?.query?.organizationSlug) {
        const bySlug = yield* tryDb(
          () =>
            db.query.organizations.findFirst({
              where: eq(
                organizations.slug,
                input.query?.organizationSlug ?? ""
              ),
              columns: { id: true },
            }),
          "Failed to load organization"
        );
        organizationId = bySlug?.id;
      }

      if (!organizationId) {
        organizationId = session.session.activeOrganizationId ?? undefined;
      }

      if (!organizationId) {
        return null;
      }

      yield* requireMembership(session, organizationId);

      const organization = yield* tryDb(
        () =>
          db.query.organizations.findFirst({
            where: eq(organizations.id, organizationId ?? ""),
            with: {
              members: {
                with: {
                  users: {
                    columns: { id: true, name: true, email: true, image: true },
                  },
                },
              },
            },
          }),
        "Failed to load organization"
      );

      if (!organization) {
        return null;
      }

      const { members: memberRows, ...rest } = organization;

      const full: FullOrganization = {
        ...rest,
        members: mapMemberRows(memberRows),
      };

      return full;
    })
  );
}

export async function listMembersAction(
  rawInput?: ListMembersInput
): Promise<ActionResult<MembersListResult>> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();
      const input = yield* validateActionInput(
        organizationScopedQueryInputSchema,
        rawInput
      );
      const organizationId = yield* resolveOrganizationId(
        session,
        input?.query?.organizationId
      );
      yield* requireMembership(session, organizationId);

      const rows = yield* tryDb(
        () =>
          db.query.members.findMany({
            where: eq(members.organizationId, organizationId),
            orderBy: [desc(members.createdAt)],
            with: {
              users: {
                columns: { id: true, name: true, email: true, image: true },
              },
            },
          }),
        "Failed to list members"
      );

      const mapped = mapMemberRows(rows);
      return { members: mapped, total: mapped.length };
    })
  );
}

export async function updateMemberRoleAction(
  rawInput: UpdateMemberRoleInput
): Promise<ActionResult<MemberWithUser | null>> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();
      const input = yield* validateActionInput(
        updateMemberRoleInputSchema,
        rawInput
      );

      const member = yield* tryDb(
        () =>
          db.query.members.findFirst({
            where: eq(members.id, input.memberId),
          }),
        "Failed to load member"
      );

      if (!member) {
        return yield* Effect.fail(
          new OrganizationActionError({ message: "Member not found" })
        );
      }

      const callerMembership = yield* requireManagerMembership(
        session,
        member.organizationId
      );

      if (input.role === "owner" && callerMembership.role !== "owner") {
        return yield* Effect.fail(
          new OrganizationActionError({
            message: "Only the organization owner can assign the owner role",
          })
        );
      }

      if (member.role === "owner" && input.role !== "owner") {
        return yield* Effect.fail(
          new OrganizationActionError({
            message: "The organization owner role cannot be changed",
          })
        );
      }

      yield* tryDb(
        () =>
          db
            .update(members)
            .set({ role: input.role })
            .where(eq(members.id, input.memberId)),
        "Failed to update member role"
      );

      yield* updateMembershipRoleInWorkOS(
        member.organizationId,
        member.userId,
        input.role
      );

      const memberCount = yield* countOrganizationMembers(
        member.organizationId
      );
      yield* trackOrganizationEvent({
        event: POSTHOG_EVENTS.MEMBER_ROLE_CHANGED,
        userId: session.user.id,
        organizationId: member.organizationId,
        properties: {
          role: input.role,
          previous_role: member.role,
          member_count: memberCount,
        },
      });

      const updated = yield* tryDb(
        () =>
          db.query.members.findFirst({
            where: eq(members.id, input.memberId),
            with: {
              users: {
                columns: { id: true, name: true, email: true, image: true },
              },
            },
          }),
        "Failed to load member"
      );

      return updated ? (mapMemberRows([updated])[0] ?? null) : null;
    })
  );
}

export async function removeMemberAction(
  rawInput: RemoveMemberInput
): Promise<ActionResult<{ removed: boolean }>> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();
      const input = yield* validateActionInput(
        removeMemberInputSchema,
        rawInput
      );
      const organizationId = yield* resolveOrganizationId(
        session,
        input.organizationId
      );

      const isEmail = input.memberIdOrEmail.includes("@");

      const member = yield* tryDb(
        () =>
          isEmail
            ? db
                .select({
                  id: members.id,
                  userId: members.userId,
                  role: members.role,
                })
                .from(members)
                .innerJoin(users, eq(members.userId, users.id))
                .where(
                  and(
                    eq(members.organizationId, organizationId),
                    eq(users.email, input.memberIdOrEmail)
                  )
                )
                .then((rows) => rows[0])
            : db.query.members.findFirst({
                where: and(
                  eq(members.id, input.memberIdOrEmail),
                  eq(members.organizationId, organizationId)
                ),
                columns: { id: true, userId: true, role: true },
              }),
        "Failed to load member"
      );

      if (!member) {
        return yield* Effect.fail(
          new OrganizationActionError({ message: "Member not found" })
        );
      }

      const isSelfRemoval = member.userId === session.user.id;

      if (!isSelfRemoval) {
        yield* requireManagerMembership(session, organizationId);
      }

      if (member.role === "owner") {
        return yield* Effect.fail(
          new OrganizationActionError({
            message: "The organization owner cannot be removed",
          })
        );
      }

      yield* tryDb(
        () => db.delete(members).where(eq(members.id, member.id)),
        "Failed to remove member"
      );

      yield* removeMembershipFromWorkOS(organizationId, member.userId);

      const memberCount = yield* countOrganizationMembers(organizationId);
      yield* trackOrganizationEvent({
        event: POSTHOG_EVENTS.MEMBER_REMOVED,
        userId: session.user.id,
        organizationId,
        properties: {
          role: member.role,
          is_self_removal: isSelfRemoval,
          member_count: memberCount,
        },
      });

      return { removed: true };
    })
  );
}

export async function listInvitationsAction(rawInput?: {
  query?: { organizationId?: string };
}): Promise<ActionResult<InvitationSummary[]>> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();
      const input = yield* validateActionInput(
        organizationScopedQueryInputSchema,
        rawInput
      );
      const organizationId = yield* resolveOrganizationId(
        session,
        input?.query?.organizationId
      );
      yield* requireMembership(session, organizationId);
      const workosOrgId = yield* requireWorkOSOrganizationId(organizationId);

      const invitations = yield* tryWorkOS(
        () =>
          getWorkOS().userManagement.listInvitations({
            organizationId: workosOrgId,
            limit: 100,
          }),
        "Failed to list invitations"
      );

      return invitations.data.map(mapInvitation);
    })
  );
}

export async function inviteMemberAction(
  rawInput: InviteMemberInput
): Promise<ActionResult<InvitationSummary>> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const session = yield* requireSession();
      const input = yield* validateActionInput(
        inviteMemberInputSchema,
        rawInput
      );
      const organizationId = yield* resolveOrganizationId(
        session,
        input.organizationId
      );
      const callerMembership = yield* requireManagerMembership(
        session,
        organizationId
      );

      if (input.role === "owner" && callerMembership.role !== "owner") {
        return yield* Effect.fail(
          new OrganizationActionError({
            message: "Only the organization owner can assign the owner role",
          })
        );
      }

      if (!isNotDisposableEmail(input.email)) {
        return yield* Effect.fail(
          new OrganizationActionError({
            message: "Disposable email addresses are not allowed",
          })
        );
      }

      yield* enforceTeamMembersLimit(organizationId).pipe(
        Effect.catch((error) =>
          Effect.gen(function* () {
            if (error.message === TEAM_MEMBER_LIMIT_ERROR_MESSAGE) {
              const memberCount =
                yield* countOrganizationMembers(organizationId);
              yield* trackOrganizationEvent({
                event: POSTHOG_EVENTS.QUOTA_EXCEEDED,
                userId: session.user.id,
                organizationId,
                properties: {
                  feature: QUOTA_FEATURES.TEAM_MEMBERS,
                  reason: "limit_reached",
                  member_count: memberCount,
                },
              });
              yield* trackOrganizationEvent({
                event: POSTHOG_EVENTS.MEMBER_INVITED,
                userId: session.user.id,
                organizationId,
                properties: {
                  role: input.role,
                  limit_hit: true,
                  member_count: memberCount,
                },
              });
            }
            return yield* Effect.fail(error);
          })
        )
      );
      const workosOrgId = yield* requireWorkOSOrganizationId(organizationId);

      const invitation = yield* tryWorkOS(
        () =>
          getWorkOS().userManagement.sendInvitation({
            email: input.email,
            organizationId: workosOrgId,
            roleSlug: input.role,
            inviterUserId: session.user.workosUserId ?? undefined,
          }),
        "Failed to send invitation"
      );

      const memberCount = yield* countOrganizationMembers(organizationId);
      yield* trackOrganizationEvent({
        event: POSTHOG_EVENTS.MEMBER_INVITED,
        userId: session.user.id,
        organizationId,
        properties: {
          role: input.role,
          limit_hit: false,
          member_count: memberCount,
        },
      });

      return mapInvitation(invitation);
    })
  );
}

export async function cancelInvitationAction(
  rawInput: InvitationActionInput
): Promise<ActionResult<InvitationSummary>> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const input = yield* validateActionInput(
        invitationActionInputSchema,
        rawInput
      );
      const management = yield* requireInvitationManagement(input.invitationId);

      const revoked = yield* tryWorkOS(
        () => getWorkOS().userManagement.revokeInvitation(input.invitationId),
        "Failed to revoke invitation"
      );

      yield* trackOrganizationEvent({
        event: POSTHOG_EVENTS.INVITE_CANCELLED,
        userId: management.userId,
        organizationId: management.organizationId,
        properties: { role: revoked.roleSlug },
      });

      return mapInvitation(revoked);
    })
  );
}

export async function resendInvitationAction(
  rawInput: InvitationActionInput
): Promise<ActionResult<InvitationSummary>> {
  return runOrganizationAction(
    Effect.gen(function* () {
      const input = yield* validateActionInput(
        invitationActionInputSchema,
        rawInput
      );
      const management = yield* requireInvitationManagement(input.invitationId);

      const invitation = yield* tryWorkOS(
        () => getWorkOS().userManagement.resendInvitation(input.invitationId),
        "Failed to resend invitation"
      );

      yield* trackOrganizationEvent({
        event: POSTHOG_EVENTS.INVITE_RESENT,
        userId: management.userId,
        organizationId: management.organizationId,
        properties: { role: invitation.roleSlug },
      });

      return mapInvitation(invitation);
    })
  );
}
