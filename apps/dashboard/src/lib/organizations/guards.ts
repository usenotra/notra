import { db } from "@notra/db/drizzle";
import { members } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import { ActionFailure } from "@/lib/actions/errors";
import { getAuthSession } from "@/lib/auth/server";
import type { AuthSessionData } from "@/types/auth/session";

const MANAGER_ROLES: readonly string[] = ["owner", "admin"];

export const requireSession = Effect.fn("organizations.guards.requireSession")(
  function* () {
    const session = yield* Effect.tryPromise({
      try: () => getAuthSession(),
      catch: (cause) =>
        new ActionFailure({
          message: "Failed to load session",
          cause,
        }),
    });

    if (!session) {
      return yield* Effect.fail(new ActionFailure({ message: "Unauthorized" }));
    }

    return session;
  }
);

export const requireMembership = Effect.fn(
  "organizations.guards.requireMembership"
)(function* (session: AuthSessionData, organizationId: string) {
  const membership = yield* Effect.tryPromise({
    try: () =>
      db.query.members.findFirst({
        where: and(
          eq(members.userId, session.user.id),
          eq(members.organizationId, organizationId)
        ),
      }),
    catch: (cause) =>
      new ActionFailure({
        message: "Failed to check membership",
        cause,
      }),
  });

  if (!membership) {
    return yield* Effect.fail(
      new ActionFailure({
        message: "You are not a member of this organization",
      })
    );
  }

  return membership;
});

export const requireManagerMembership = Effect.fn(
  "organizations.guards.requireManagerMembership"
)(function* (session: AuthSessionData, organizationId: string) {
  const membership = yield* requireMembership(session, organizationId);

  if (!MANAGER_ROLES.includes(membership.role)) {
    return yield* Effect.fail(
      new ActionFailure({
        message: "You do not have permission to manage this organization",
      })
    );
  }

  return membership;
});

export const resolveOrganizationId = Effect.fn(
  "organizations.guards.resolveOrganizationId"
)(function* (session: AuthSessionData, organizationId?: string) {
  const resolved = organizationId ?? session.session.activeOrganizationId;

  if (!resolved) {
    return yield* Effect.fail(
      new ActionFailure({ message: "No active organization" })
    );
  }

  return resolved;
});
