import { db } from "@notra/db/drizzle";
import { members, organizations, users } from "@notra/db/schema";
import { isDemoMode } from "@notra/utils/demo-mode";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { WorkOSSyncError } from "@/lib/organizations/errors";

const logSyncFailure = (context: Record<string, unknown>) =>
  Effect.catch((error: WorkOSSyncError) =>
    Effect.logWarning("WorkOS sync failed").pipe(
      Effect.annotateLogs({ ...context, error: error.message })
    )
  );

// The public demo has no WorkOS; memberships only live in the database.
const skipInDemo = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A | void, E, R> =>
  Effect.suspend(() => (isDemoMode() ? Effect.void : effect));

const ensureWorkOSOrganization = Effect.fn(
  "organizations.sync.ensureWorkOSOrganization"
)(function* (organizationId: string) {
  return yield* Effect.tryPromise({
    try: async () => {
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
        columns: { name: true, workosOrgId: true },
      });

      if (!organization) {
        throw new Error(`Organization ${organizationId} not found`);
      }

      if (organization.workosOrgId) {
        return { workosOrgId: organization.workosOrgId, healed: false };
      }

      let workosOrgId: string;
      try {
        const created = await getWorkOS().organizations.createOrganization({
          name: organization.name,
          externalId: organizationId,
        });
        workosOrgId = created.id;
      } catch (createError) {
        try {
          const existing =
            await getWorkOS().organizations.getOrganizationByExternalId(
              organizationId
            );
          workosOrgId = existing.id;
        } catch {
          throw createError;
        }
      }

      await db
        .update(organizations)
        .set({ workosOrgId })
        .where(eq(organizations.id, organizationId));

      return { workosOrgId, healed: true };
    },
    catch: (cause) =>
      new WorkOSSyncError({
        message: "Failed to link organization to WorkOS",
        cause,
      }),
  });
});

export const syncOrganizationNameToWorkOS = Effect.fn(
  "organizations.sync.syncOrganizationName"
)(function* (organizationId: string, name: string) {
  yield* Effect.gen(function* () {
    const { workosOrgId } = yield* ensureWorkOSOrganization(organizationId);

    yield* Effect.tryPromise({
      try: () =>
        getWorkOS().organizations.updateOrganization({
          organization: workosOrgId,
          name,
        }),
      catch: (cause) =>
        new WorkOSSyncError({
          message: "Failed to sync organization name to WorkOS",
          cause,
        }),
    });
  }).pipe(logSyncFailure({ organizationId }), skipInDemo);
});

export const ensureWorkOSOrganizationWithMembers = Effect.fn(
  "organizations.sync.ensureWorkOSOrganizationWithMembers"
)(function* (organizationId: string) {
  const result = yield* ensureWorkOSOrganization(organizationId);

  if (result.healed) {
    yield* syncAllMembershipsToWorkOS(organizationId);
  }

  return result.workosOrgId;
});

const syncAllMembershipsToWorkOS = Effect.fn(
  "organizations.sync.syncAllMemberships"
)(function* (organizationId: string) {
  const rows = yield* Effect.tryPromise({
    try: () =>
      db.query.members.findMany({
        where: eq(members.organizationId, organizationId),
        columns: { userId: true, role: true },
      }),
    catch: (cause) =>
      new WorkOSSyncError({ message: "Failed to load members", cause }),
  });

  for (const row of rows) {
    yield* createWorkOSMembership(organizationId, row.userId, row.role);
  }
});

const createWorkOSMembership = Effect.fn(
  "organizations.sync.createWorkOSMembership"
)(function* (organizationId: string, userId: string, roleSlug?: string) {
  yield* Effect.tryPromise({
    try: async () => {
      const [organization, user] = await Promise.all([
        db.query.organizations.findFirst({
          where: eq(organizations.id, organizationId),
          columns: { workosOrgId: true },
        }),
        db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { workosUserId: true },
        }),
      ]);

      if (!(organization?.workosOrgId && user?.workosUserId)) {
        return;
      }

      try {
        await getWorkOS().userManagement.createOrganizationMembership({
          organizationId: organization.workosOrgId,
          userId: user.workosUserId,
          roleSlug,
        });
      } catch (createError) {
        const existing =
          await getWorkOS().userManagement.listOrganizationMemberships({
            organizationId: organization.workosOrgId,
            userId: user.workosUserId,
          });

        if (existing.data.length === 0) {
          throw createError;
        }
      }
    },
    catch: (cause) =>
      new WorkOSSyncError({
        message: "Failed to create WorkOS membership",
        cause,
      }),
  });
});

export const updateMembershipRoleInWorkOS = Effect.fn(
  "organizations.sync.updateWorkOSMembershipRole"
)(function* (organizationId: string, userId: string, roleSlug: string) {
  yield* Effect.tryPromise({
    try: async () => {
      const [organization, user] = await Promise.all([
        db.query.organizations.findFirst({
          where: eq(organizations.id, organizationId),
          columns: { workosOrgId: true },
        }),
        db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { workosUserId: true },
        }),
      ]);

      if (!(organization?.workosOrgId && user?.workosUserId)) {
        return;
      }

      const memberships =
        await getWorkOS().userManagement.listOrganizationMemberships({
          organizationId: organization.workosOrgId,
          userId: user.workosUserId,
        });

      const membership = memberships.data[0];

      if (membership) {
        await getWorkOS().userManagement.updateOrganizationMembership(
          membership.id,
          { roleSlug }
        );
        return;
      }

      await getWorkOS().userManagement.createOrganizationMembership({
        organizationId: organization.workosOrgId,
        userId: user.workosUserId,
        roleSlug,
      });
    },
    catch: (cause) =>
      new WorkOSSyncError({
        message: "Failed to update WorkOS membership role",
        cause,
      }),
  }).pipe(logSyncFailure({ organizationId, userId }), skipInDemo);
});

export const deleteOrganizationFromWorkOS = Effect.fn(
  "organizations.sync.deleteWorkOSOrganization"
)(function* (workosOrgId: string | null) {
  if (!workosOrgId) {
    return;
  }

  yield* Effect.tryPromise({
    try: () => getWorkOS().organizations.deleteOrganization(workosOrgId),
    catch: (cause) =>
      new WorkOSSyncError({
        message: "Failed to delete WorkOS organization",
        cause,
      }),
  }).pipe(logSyncFailure({ workosOrgId }), skipInDemo);
});

export const removeMembershipFromWorkOS = Effect.fn(
  "organizations.sync.removeWorkOSMembership"
)(function* (organizationId: string, userId: string) {
  yield* Effect.tryPromise({
    try: async () => {
      const [organization, user] = await Promise.all([
        db.query.organizations.findFirst({
          where: eq(organizations.id, organizationId),
          columns: { workosOrgId: true },
        }),
        db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { workosUserId: true },
        }),
      ]);

      if (!(organization?.workosOrgId && user?.workosUserId)) {
        return;
      }

      const memberships =
        await getWorkOS().userManagement.listOrganizationMemberships({
          organizationId: organization.workosOrgId,
          userId: user.workosUserId,
        });

      await Promise.all(
        memberships.data.map((membership) =>
          getWorkOS().userManagement.deleteOrganizationMembership(membership.id)
        )
      );
    },
    catch: (cause) =>
      new WorkOSSyncError({
        message: "Failed to remove WorkOS membership",
        cause,
      }),
  }).pipe(logSyncFailure({ organizationId, userId }), skipInDemo);
});
