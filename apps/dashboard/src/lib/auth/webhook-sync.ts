import { db } from "@notra/db/drizzle";
import { members, organizations, users } from "@notra/db/schema";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import type { OrganizationMembership } from "@workos-inc/node";
import { and, eq, sql } from "drizzle-orm";
import { Data, Effect } from "effect";

class WebhookSyncError extends Data.TaggedError("WebhookSyncError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

const resolveLocalIds = Effect.fn("auth.webhook.resolveLocalIds")(function* (
  membership: OrganizationMembership
) {
  const [organization, user] = yield* Effect.tryPromise({
    try: () =>
      Promise.all([
        db.query.organizations.findFirst({
          where: eq(organizations.workosOrgId, membership.organizationId),
          columns: { id: true },
        }),
        db.query.users.findFirst({
          where: eq(users.workosUserId, membership.userId),
          columns: { id: true },
        }),
      ]),
    catch: (cause) =>
      new WebhookSyncError({ message: "Failed to resolve local ids", cause }),
  });

  return {
    organizationId: organization?.id ?? null,
    userId: user?.id ?? null,
  };
});

const resolveOrganizationIdByExternalId = Effect.fn(
  "auth.webhook.resolveOrganizationByExternalId"
)(function* (workosOrgId: string) {
  return yield* Effect.tryPromise({
    try: async () => {
      const remote =
        await getWorkOS().organizations.getOrganization(workosOrgId);

      if (!remote.externalId) {
        return null;
      }

      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, remote.externalId),
        columns: { id: true },
      });

      return organization?.id ?? null;
    },
    catch: (cause) =>
      new WebhookSyncError({
        message: "Failed to resolve organization via WorkOS",
        cause,
      }),
  });
});

const resolveUserIdByExternalId = Effect.fn(
  "auth.webhook.resolveUserByExternalId"
)(function* (workosUserId: string) {
  return yield* Effect.tryPromise({
    try: async () => {
      const remote = await getWorkOS().userManagement.getUser(workosUserId);

      const user = await db.query.users.findFirst({
        where: remote.externalId
          ? eq(users.id, remote.externalId)
          : eq(users.email, remote.email),
        columns: { id: true },
      });

      return user?.id ?? null;
    },
    catch: (cause) =>
      new WebhookSyncError({
        message: "Failed to resolve user via WorkOS",
        cause,
      }),
  });
});

export const upsertMembershipFromWebhook = Effect.fn(
  "auth.webhook.upsertMembership"
)(function* (membership: OrganizationMembership) {
  const { organizationId, userId } = yield* resolveLocalIds(membership);

  if (!(organizationId && userId)) {
    yield* Effect.logInfo("Skipping membership webhook - unmapped ids").pipe(
      Effect.annotateLogs({
        workosOrgId: membership.organizationId,
        workosUserId: membership.userId,
      })
    );
    return;
  }

  const role = membership.role.slug || "member";

  yield* Effect.tryPromise({
    try: async () => {
      await db
        .insert(members)
        .values({
          id: crypto.randomUUID(),
          organizationId,
          userId,
          role,
          createdAt: new Date(membership.createdAt),
        })
        .onConflictDoUpdate({
          target: [members.organizationId, members.userId],
          set: {
            role: sql`CASE WHEN ${members.role} = 'owner' THEN ${members.role} ELSE excluded.role END`,
          },
        });
    },
    catch: (cause) =>
      new WebhookSyncError({ message: "Failed to upsert membership", cause }),
  });
});

export const removeMembershipFromWebhook = Effect.fn(
  "auth.webhook.removeMembership"
)(function* (membership: OrganizationMembership) {
  const resolved = yield* resolveLocalIds(membership);

  const organizationId =
    resolved.organizationId ??
    (yield* resolveOrganizationIdByExternalId(membership.organizationId));
  const userId =
    resolved.userId ?? (yield* resolveUserIdByExternalId(membership.userId));

  if (!(organizationId && userId)) {
    yield* Effect.logWarning(
      "Membership deletion webhook could not be mapped to local records"
    ).pipe(
      Effect.annotateLogs({
        workosOrgId: membership.organizationId,
        workosUserId: membership.userId,
      })
    );
    return;
  }

  yield* Effect.tryPromise({
    try: () =>
      db
        .delete(members)
        .where(
          and(
            eq(members.userId, userId),
            eq(members.organizationId, organizationId)
          )
        ),
    catch: (cause) =>
      new WebhookSyncError({ message: "Failed to remove membership", cause }),
  });
});
