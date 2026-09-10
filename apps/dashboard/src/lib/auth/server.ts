import { db } from "@notra/db/drizzle";
import { members, organizations } from "@notra/db/schema";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { LAST_VISITED_ORGANIZATION_COOKIE } from "@/constants/cookies";
import { isUserBanned } from "@/lib/auth/banned";
import { AuthSessionError } from "@/lib/auth/errors";
import { ensureLocalUser } from "@/lib/auth/sync";
import type { AuthIdentityData, AuthSessionData } from "@/types/auth/session";

const readLastVisitedOrganizationSlug = Effect.fn(
  "auth.session.readLastVisitedSlug"
)(function* () {
  const cookieStore = yield* Effect.tryPromise({
    try: () => cookies(),
    catch: (cause) =>
      new AuthSessionError({ message: "Failed to read cookies", cause }),
  });

  const slug = cookieStore.get(LAST_VISITED_ORGANIZATION_COOKIE)?.value;
  return slug?.trim() || null;
});

const resolveActiveOrganizationId = Effect.fn(
  "auth.session.resolveActiveOrganization"
)(function* (userId: string) {
  const lastVisitedSlug = yield* readLastVisitedOrganizationSlug().pipe(
    Effect.catch(() => Effect.succeed(null))
  );

  if (lastVisitedSlug) {
    const organization = yield* Effect.tryPromise({
      try: () =>
        db.query.organizations.findFirst({
          where: eq(organizations.slug, lastVisitedSlug),
          columns: { id: true },
          with: {
            members: {
              where: eq(members.userId, userId),
              columns: { id: true },
            },
          },
        }),
      catch: (cause) =>
        new AuthSessionError({
          message: "Failed to resolve organization from cookie",
          cause,
        }),
    });

    if (organization && organization.members.length > 0) {
      return organization.id;
    }
  }

  const membership = yield* Effect.tryPromise({
    try: () =>
      db.query.members.findFirst({
        where: eq(members.userId, userId),
        columns: { organizationId: true },
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      }),
    catch: (cause) =>
      new AuthSessionError({
        message: "Failed to resolve membership",
        cause,
      }),
  });

  return membership?.organizationId ?? null;
});

const buildAuthIdentity = Effect.fn("auth.identity.build")(function* (
  workosUser: Parameters<typeof ensureLocalUser>[0],
  impersonatorEmail: string | null
) {
  const user = yield* ensureLocalUser(workosUser);

  if (isUserBanned(user)) {
    return yield* Effect.fail(
      new AuthSessionError({
        message: "User is banned",
        cause: null,
      })
    );
  }

  const identity: AuthIdentityData = {
    impersonatedBy: impersonatorEmail,
    user,
  };

  return identity;
});

export const getAuthIdentity = cache(
  async (): Promise<AuthIdentityData | null> => {
    await connection();

    let authResult: Awaited<ReturnType<typeof withAuth>>;

    try {
      authResult = await withAuth();
    } catch (error) {
      unstable_rethrow(error);
      console.error("Error reading AuthKit session", error);
      return null;
    }

    if (!authResult.user) {
      return null;
    }

    return await Effect.runPromise(
      buildAuthIdentity(
        authResult.user,
        authResult.impersonator?.email ?? null
      ).pipe(
        Effect.catch((error) =>
          Effect.logWarning("Failed to build auth session").pipe(
            Effect.annotateLogs({
              workosUserId: authResult.user?.id,
              error: error.message,
            }),
            Effect.as(null)
          )
        )
      )
    );
  }
);

export const getAuthSession = cache(
  async (): Promise<AuthSessionData | null> => {
    const identity = await getAuthIdentity();
    if (!identity) {
      return null;
    }

    return Effect.runPromise(
      resolveActiveOrganizationId(identity.user.id).pipe(
        Effect.map((activeOrganizationId) => ({
          session: {
            userId: identity.user.id,
            activeOrganizationId,
            impersonatedBy: identity.impersonatedBy,
          },
          user: identity.user,
        })),
        Effect.catch((error) =>
          Effect.logWarning("Failed to build auth session").pipe(
            Effect.annotateLogs({ error: error.message }),
            Effect.as(null)
          )
        )
      )
    );
  }
);
