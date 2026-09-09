import { db } from "@notra/db/drizzle";
import {
  members,
  organizations,
  socialConnections,
  users,
} from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import type { User } from "@workos-inc/node";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";
import { isFreeEmail } from "free-email-domains-list";
import { isValid as isNotDisposableEmail } from "mailchecker";

import { FIRST_LOGIN_WINDOW_MS } from "@/constants/analytics-events";
import { toAnalyticsAuthMethod } from "@/lib/analytics/auth-method";
import {
  setPersonProperties,
  trackServerEvent,
} from "@/lib/analytics/posthog-server";
import { readRequestHeaders } from "@/lib/analytics/request-headers";
import { SocialConnectionError, UserSyncError } from "@/lib/auth/errors";
import { isWorkOSNotFound } from "@/lib/auth/workos-error";
import { sendWelcomeEmailAction } from "@/lib/email/actions";
import type {
  OAuthProviderTokens,
  SyncAuthenticatedUserInput,
} from "@/types/auth/sync";

const GITHUB_USER_ENDPOINT = "https://api.github.com/user";
const WORKOS_USER_VERIFY_RETRIES = 2;

const AUTH_METHOD_PROVIDERS: Record<string, string> = {
  GitHubOAuth: "github",
  GoogleOAuth: "google",
};

function buildUserName(workosUser: User) {
  const name = [workosUser.firstName, workosUser.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || workosUser.email;
}

const linkWorkOSExternalId = Effect.fn("auth.sync.linkWorkOSExternalId")(
  function* (workosUserId: string, localUserId: string) {
    yield* Effect.tryPromise({
      try: () =>
        getWorkOS().userManagement.updateUser({
          userId: workosUserId,
          externalId: localUserId,
        }),
      catch: (cause) =>
        new UserSyncError({
          message: "Failed to set WorkOS external id",
          cause,
        }),
    }).pipe(
      Effect.catch((error) =>
        Effect.logWarning("Could not backlink WorkOS external id").pipe(
          Effect.annotateLogs({ workosUserId, error: error.message })
        )
      )
    );
  }
);

const fetchGitHubAccountId = Effect.fn("auth.sync.fetchGitHubAccountId")(
  function* (accessToken: string) {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(GITHUB_USER_ENDPOINT, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
          },
        }),
      catch: (cause) =>
        new SocialConnectionError({
          message: "Failed to fetch GitHub account",
          cause,
        }),
    });

    if (!response.ok) {
      return yield* Effect.fail(
        new SocialConnectionError({
          message: `GitHub account lookup failed with status ${response.status}`,
          cause: null,
        })
      );
    }

    const payload = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (cause) =>
        new SocialConnectionError({
          message: "Failed to parse GitHub account response",
          cause,
        }),
    });

    if (
      payload &&
      typeof payload === "object" &&
      "id" in payload &&
      (typeof payload.id === "number" || typeof payload.id === "string")
    ) {
      return String(payload.id);
    }

    return yield* Effect.fail(
      new SocialConnectionError({
        message: "GitHub account response missing id",
        cause: null,
      })
    );
  }
);

const persistSocialConnection = Effect.fn("auth.sync.persistSocialConnection")(
  function* (userId: string, provider: string, tokens: OAuthProviderTokens) {
    const providerAccountId =
      provider === "github"
        ? yield* fetchGitHubAccountId(tokens.accessToken)
        : "";

    yield* Effect.tryPromise({
      try: () =>
        db
          .insert(socialConnections)
          .values({
            id: crypto.randomUUID(),
            userId,
            provider,
            providerAccountId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken ?? null,
            scope: tokens.scopes?.join(" ") ?? null,
            accessTokenExpiresAt: tokens.expiresAt
              ? new Date(tokens.expiresAt * 1000)
              : null,
          })
          .onConflictDoUpdate({
            target: [socialConnections.userId, socialConnections.provider],
            set: {
              providerAccountId,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken ?? null,
              scope: tokens.scopes?.join(" ") ?? null,
              accessTokenExpiresAt: tokens.expiresAt
                ? new Date(tokens.expiresAt * 1000)
                : null,
            },
          }),
      catch: (cause) =>
        new SocialConnectionError({
          message: "Failed to persist social connection",
          cause,
        }),
    });
  }
);

export const ensureLocalUser = Effect.fn("auth.sync.ensureLocalUser")(
  function* (workosUser: User, authenticationMethod?: string) {
    const byWorkosId = yield* Effect.tryPromise({
      try: () =>
        db.query.users.findFirst({
          where: eq(users.workosUserId, workosUser.id),
        }),
      catch: (cause) =>
        new UserSyncError({ message: "Failed to look up user", cause }),
    });

    if (byWorkosId) {
      return byWorkosId;
    }

    const byEmail = yield* Effect.tryPromise({
      try: () =>
        db.query.users.findFirst({
          where: eq(users.email, workosUser.email),
        }),
      catch: (cause) =>
        new UserSyncError({ message: "Failed to look up user", cause }),
    });

    if (byEmail) {
      if (!workosUser.emailVerified) {
        return yield* Effect.fail(
          new UserSyncError({
            message:
              "Verify your email address before signing in to this account",
          })
        );
      }

      const [linked] = yield* Effect.tryPromise({
        try: () =>
          db
            .update(users)
            .set({ workosUserId: workosUser.id })
            .where(eq(users.id, byEmail.id))
            .returning(),
        catch: (cause) =>
          new UserSyncError({
            message: "Failed to link user to WorkOS",
            cause,
          }),
      });

      yield* linkWorkOSExternalId(workosUser.id, byEmail.id);
      return linked ?? byEmail;
    }

    if (!isNotDisposableEmail(workosUser.email)) {
      return yield* Effect.fail(
        new UserSyncError({
          message: "Disposable email addresses are not allowed",
        })
      );
    }

    yield* Effect.tryPromise({
      try: () => getWorkOS().userManagement.getUser(workosUser.id),
      catch: (cause) =>
        new UserSyncError({
          message: isWorkOSNotFound(cause)
            ? "WorkOS user no longer exists"
            : "Failed to verify WorkOS user",
          cause,
        }),
    }).pipe(
      Effect.retry({
        times: WORKOS_USER_VERIFY_RETRIES,
        while: (error) => !isWorkOSNotFound(error.cause),
      }),
      Effect.tapError((error) =>
        Effect.logWarning("Could not verify WorkOS user").pipe(
          Effect.annotateLogs({
            workosUserId: workosUser.id,
            notFound: isWorkOSNotFound(error.cause),
            error: error.message,
          })
        )
      )
    );

    const [created] = yield* Effect.tryPromise({
      try: () =>
        db
          .insert(users)
          .values({
            id: crypto.randomUUID(),
            name: buildUserName(workosUser),
            email: workosUser.email,
            emailVerified: workosUser.emailVerified,
            image: workosUser.profilePictureUrl,
            workosUserId: workosUser.id,
          })
          .returning(),
      catch: (cause) =>
        new UserSyncError({ message: "Failed to create user", cause }),
    });

    if (!created) {
      return yield* Effect.fail(
        new UserSyncError({ message: "User creation returned no row" })
      );
    }

    yield* linkWorkOSExternalId(workosUser.id, created.id);
    yield* Effect.sync(() => {
      sendWelcomeEmailAction({ userEmail: created.email });
    });

    const signupMethod = toAnalyticsAuthMethod(authenticationMethod);
    const requestHeaders = yield* Effect.promise(readRequestHeaders);
    yield* Effect.sync(() => {
      trackServerEvent({
        event: POSTHOG_EVENTS.SIGNUP_COMPLETED,
        headers: requestHeaders,
        userId: created.id,
        properties: {
          method: signupMethod,
          email_domain_is_free: isFreeEmail(created.email.toLowerCase()),
        },
      });
      setPersonProperties({
        userId: created.id,
        setOnce: {
          signup_method: signupMethod,
          signed_up_at: created.createdAt.toISOString(),
        },
      });
    });

    return created;
  }
);

const reconcileWorkOSMemberships = Effect.fn("auth.sync.reconcileMemberships")(
  function* (localUserId: string, workosUserId: string) {
    const memberships = yield* Effect.tryPromise({
      try: () =>
        getWorkOS().userManagement.listOrganizationMemberships({
          userId: workosUserId,
          statuses: ["active"],
          limit: 100,
        }),
      catch: (cause) =>
        new UserSyncError({
          message: "Failed to list WorkOS memberships",
          cause,
        }),
    });

    if (memberships.data.length === 0) {
      return;
    }

    const workosOrgIds = memberships.data.map(
      (membership) => membership.organizationId
    );

    const localOrganizations = yield* Effect.tryPromise({
      try: () =>
        db.query.organizations.findMany({
          where: inArray(organizations.workosOrgId, workosOrgIds),
          columns: { id: true, workosOrgId: true },
        }),
      catch: (cause) =>
        new UserSyncError({ message: "Failed to load organizations", cause }),
    });

    const localOrgByWorkosId = new Map(
      localOrganizations.map((organization) => [
        organization.workosOrgId,
        organization.id,
      ])
    );

    for (const membership of memberships.data) {
      const localOrgId = localOrgByWorkosId.get(membership.organizationId);

      if (!localOrgId) {
        continue;
      }

      const role = membership.role.slug || "member";

      yield* Effect.tryPromise({
        try: async () => {
          await db
            .insert(members)
            .values({
              id: crypto.randomUUID(),
              organizationId: localOrgId,
              userId: localUserId,
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
          new UserSyncError({ message: "Failed to sync membership", cause }),
      });
    }
  }
);

export const syncAuthenticatedUser = Effect.fn("auth.sync.authenticatedUser")(
  function* ({
    workosUser,
    oauthTokens,
    authenticationMethod,
  }: SyncAuthenticatedUserInput) {
    const localUser = yield* ensureLocalUser(workosUser, authenticationMethod);

    const requestHeaders = yield* Effect.promise(readRequestHeaders);
    yield* Effect.sync(() => {
      trackServerEvent({
        event: POSTHOG_EVENTS.LOGIN_SUCCEEDED,
        headers: requestHeaders,
        userId: localUser.id,
        properties: {
          method: toAnalyticsAuthMethod(authenticationMethod),
          is_first_login:
            Date.now() - localUser.createdAt.getTime() < FIRST_LOGIN_WINDOW_MS,
        },
      });
    });

    yield* reconcileWorkOSMemberships(localUser.id, workosUser.id).pipe(
      Effect.catch((error) =>
        Effect.logWarning("Could not reconcile WorkOS memberships").pipe(
          Effect.annotateLogs({ userId: localUser.id, error: error.message })
        )
      )
    );

    const provider = authenticationMethod
      ? AUTH_METHOD_PROVIDERS[authenticationMethod]
      : undefined;

    if (provider && oauthTokens?.accessToken) {
      yield* persistSocialConnection(localUser.id, provider, oauthTokens).pipe(
        Effect.catch((error) =>
          Effect.logWarning("Could not persist social connection").pipe(
            Effect.annotateLogs({
              userId: localUser.id,
              provider,
              error: error.message,
            })
          )
        )
      );
    }

    return localUser;
  }
);
