import { logError } from "@notra/ai/utils/server-log";
import { db } from "@notra/db/drizzle";
import { members, organizations, users } from "@notra/db/schema";
import { isDemoMode } from "@notra/utils/demo-mode";
import { isNotFound, isRedirect } from "@tanstack/react-router";
import { getCookie, getRequestHeaders } from "@tanstack/react-start/server";
import { getAuthKitContext } from "@workos/authkit-tanstack-react-start";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { LAST_VISITED_ORGANIZATION_COOKIE } from "@/constants/cookies";
import { isUserBanned } from "@/lib/auth/banned";
import { AuthSessionError } from "@/lib/auth/errors";
import { cacheAuthRequest } from "@/lib/auth/request-cache";
import { ensureLocalUser } from "@/lib/auth/sync";
import type { AuthIdentityData, AuthSessionData } from "@/types/auth/session";
import {
  evaluateLocalDevAuth,
  isLocalDevAuthEnabled,
} from "@/utils/local-dev-auth";

const readLastVisitedOrganizationSlug = Effect.fn(
  "auth.session.readLastVisitedSlug"
)(function* () {
  const slug = yield* Effect.try({
    try: () => getCookie(LAST_VISITED_ORGANIZATION_COOKIE),
    catch: (cause) =>
      new AuthSessionError({ message: "Failed to read cookies", cause }),
  });

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

const loadLocalDevIdentity = Effect.fn("auth.identity.localDev")(function* () {
  const email = process.env.DEV_AUTH_EMAIL?.trim();
  if (!email) {
    return null;
  }

  const user = yield* Effect.tryPromise({
    try: () =>
      db.query.users.findFirst({
        where: eq(users.email, email),
      }),
    catch: (cause) =>
      new AuthSessionError({
        message: "Failed to load local development user",
        cause,
      }),
  });

  if (!user) {
    return null;
  }

  if (isUserBanned(user)) {
    return yield* Effect.fail(
      new AuthSessionError({
        message: "User is banned",
        cause: null,
      })
    );
  }

  const identity: AuthIdentityData = {
    impersonatedBy: null,
    user,
  };
  return identity;
});

export const getAuthIdentity = cacheAuthRequest(
  async (): Promise<AuthIdentityData | null> => {
    // The public demo has no WorkOS: a signed cookie maps the anonymous
    // visitor to their sandbox user.
    if (isDemoMode()) {
      try {
        // Imported only in demo mode: the sandbox module pulls in the GEO
        // sample data and scan programs, which every request would otherwise
        // load on a cold server.
        const { loadDemoIdentity } = await import("@/lib/demo/session");
        return await loadDemoIdentity();
      } catch (error) {
        if (isRedirect(error) || isNotFound(error)) {
          throw error;
        }
        logError("Error reading demo session", error);
        return null;
      }
    }

    if (isLocalDevAuthEnabled()) {
      let headerList: Headers | null = null;
      try {
        headerList = getRequestHeaders();
      } catch {
        headerList = null;
      }
      const gate = evaluateLocalDevAuth(headerList);
      if (gate.kind === "allowed") {
        return Effect.runPromise(
          loadLocalDevIdentity().pipe(
            Effect.catch((error) =>
              Effect.logWarning("Failed to build local dev session").pipe(
                Effect.annotateLogs({ error: error.message }),
                Effect.as(null)
              )
            )
          )
        );
      }
      return null;
    }

    let authResult: ReturnType<ReturnType<typeof getAuthKitContext>["auth"]>;

    try {
      authResult = getAuthKitContext().auth();
    } catch (error) {
      if (isRedirect(error) || isNotFound(error)) {
        throw error;
      }
      logError("Error reading AuthKit session", error);
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

export const getAuthSession = cacheAuthRequest(
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
