import { redis } from "@notra/ai/utils/redis";
import { db } from "@notra/db/drizzle";
import { connectedSocialAccounts } from "@notra/db/schema";
import {
  type SocialConnectOAuthState,
  type SocialConnectPlatform,
  socialConnectOAuthStateSchema,
} from "@notra/schemas/dashboard/social-accounts";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import type { SocialAccount } from "post-for-me/resources/social-accounts";

import { SOCIAL_CONNECT_STATE_TTL_SECONDS } from "@/constants/social-connect";
import { normalizeTwitterProfileImageUrl } from "@/constants/twitter";
import {
  clearProviderAccountExternalId,
  fromProviderPlatform,
  getLinkedInConnectionType,
  getLinkedInProfileUrl,
  getSocialConnectClient,
  hasProviderPremium,
  isSocialConnectConfigured,
  toProviderPlatform,
} from "@/lib/social-connect/client";
import {
  getSocialConnectStatusCode,
  SocialConnectCallbackError,
  SocialConnectConfigError,
  SocialConnectRequestError,
} from "@/lib/social-connect/errors";
import type {
  BeginSocialConnectParams,
  CompleteSocialConnectParams,
  CompleteSocialConnectResult,
  LinkedInSelectionStash,
} from "@/types/services/social-connect";
import { fetchTwitterVerification } from "@/utils/twitter-fetcher";

function getStateKey(state: string) {
  return `social_connect_oauth:${state}`;
}

export function getLinkedInSelectionKey(token: string) {
  return `social_connect_linkedin_selection:${token}`;
}

export const beginSocialConnect = Effect.fn("beginSocialConnect")(function* (
  params: BeginSocialConnectParams
) {
  if (!isSocialConnectConfigured()) {
    return yield* Effect.fail(
      new SocialConnectConfigError({
        message: "Social account linking is not configured",
      })
    );
  }

  const redisClient = redis;
  if (!redisClient) {
    return yield* Effect.fail(
      new SocialConnectConfigError({ message: "Redis is not configured" })
    );
  }

  const state = crypto.randomUUID();
  const oauthState: SocialConnectOAuthState = {
    callbackPath: params.callbackPath,
    organizationId: params.organizationId,
    userId: params.userId,
    platform: params.platform,
  };

  yield* Effect.tryPromise({
    try: () =>
      redisClient.set(getStateKey(state), JSON.stringify(oauthState), {
        ex: SOCIAL_CONNECT_STATE_TTL_SECONDS,
      }),
    catch: (cause) =>
      new SocialConnectRequestError({
        message: "Failed to store connect state",
        cause,
      }),
  });

  const result = yield* Effect.tryPromise({
    try: () =>
      getSocialConnectClient(params.platform).socialAccounts.createAuthURL({
        platform: toProviderPlatform(params.platform),
        external_id: state,
        ...(params.platform === "linkedin"
          ? {
              platform_data: {
                linkedin: { connection_type: "organization" as const },
              },
            }
          : {}),
      }),
    catch: (cause) =>
      new SocialConnectRequestError({
        message: "Failed to create account connect link",
        cause,
      }),
  });

  if (!result.url) {
    return yield* Effect.fail(
      new SocialConnectRequestError({
        message: "Failed to create account connect link",
        cause: null,
      })
    );
  }

  return { url: result.url };
});

const loadOAuthStateForAccount = Effect.fn("loadOAuthStateForAccount")(
  function* (state: string) {
    const redisClient = redis;
    if (!redisClient) {
      return yield* Effect.fail(
        new SocialConnectCallbackError({ code: "invalid_callback" })
      );
    }

    const raw = yield* Effect.tryPromise({
      try: () => redisClient.getdel<string>(getStateKey(state)),
      catch: (cause) =>
        new SocialConnectCallbackError({ code: "expired_state", cause }),
    });

    if (!raw) {
      return yield* Effect.fail(
        new SocialConnectCallbackError({ code: "expired_state" })
      );
    }

    const stateJson = yield* Effect.try({
      try: (): unknown => (typeof raw === "string" ? JSON.parse(raw) : raw),
      catch: (cause) =>
        new SocialConnectCallbackError({ code: "invalid_callback", cause }),
    });

    const parsedState = socialConnectOAuthStateSchema.safeParse(stateJson);
    if (!parsedState.success) {
      return yield* Effect.fail(
        new SocialConnectCallbackError({ code: "invalid_callback" })
      );
    }

    return parsedState.data;
  }
);

const resolveFirstAccount = Effect.fn("resolveFirstAccount")(function* (
  accountId: string,
  platformHint: SocialConnectPlatform | null
) {
  const candidatePlatforms: SocialConnectPlatform[] = platformHint
    ? [platformHint]
    : ["twitter", "linkedin"];

  for (const platform of candidatePlatforms) {
    const account = yield* Effect.tryPromise({
      try: (): Promise<SocialAccount> =>
        getSocialConnectClient(platform).socialAccounts.retrieve(accountId),
      catch: (cause) =>
        new SocialConnectCallbackError({ code: "account_fetch_failed", cause }),
    }).pipe(Effect.catch(() => Effect.succeed(null)));

    if (account) {
      return { platform, account };
    }
  }

  return yield* Effect.fail(
    new SocialConnectCallbackError({ code: "account_fetch_failed" })
  );
});

const buildAccountDetails = Effect.fn("buildAccountDetails")(function* (
  platform: SocialConnectPlatform,
  account: SocialAccount
) {
  const username = account.username ?? account.user_id;
  const rawProfileImageUrl = account.profile_photo_url;
  let profileImageUrl =
    rawProfileImageUrl && platform === "twitter"
      ? normalizeTwitterProfileImageUrl(rawProfileImageUrl)
      : rawProfileImageUrl;

  let displayName = username;
  let verifiedType: string | null = null;
  if (platform === "twitter") {
    const verification = yield* fetchTwitterVerification(username).pipe(
      Effect.catch(() => Effect.succeed(null))
    );
    displayName = verification?.name ?? username;
    profileImageUrl = verification?.profileImageUrl ?? profileImageUrl;
    verifiedType =
      verification?.verifiedType ??
      (hasProviderPremium(account.metadata) ? "blue" : null);
  }
  const verified = verifiedType !== null && verifiedType !== "none";

  return { username, displayName, profileImageUrl, verified, verifiedType };
});

export const completeSocialConnect = Effect.fn("completeSocialConnect")(
  function* (params: CompleteSocialConnectParams) {
    if (!isSocialConnectConfigured()) {
      return yield* Effect.fail(
        new SocialConnectCallbackError({ code: "callback_failed" })
      );
    }

    const firstAccountId = params.accountIds.at(0);
    if (!firstAccountId) {
      return yield* Effect.fail(
        new SocialConnectCallbackError({ code: "connection_failed" })
      );
    }

    const { platform: clientPlatform, account: firstAccount } =
      yield* resolveFirstAccount(firstAccountId, params.platform);

    const state = firstAccount.external_id;
    if (!state) {
      return yield* Effect.fail(
        new SocialConnectCallbackError({ code: "invalid_callback" })
      );
    }

    const oauthState = yield* loadOAuthStateForAccount(state);

    if (!params.userId || params.userId !== oauthState.userId) {
      return yield* Effect.fail(
        new SocialConnectCallbackError({ code: "state_mismatch" })
      );
    }

    const client = getSocialConnectClient(clientPlatform);

    const remainingAccounts = yield* Effect.tryPromise({
      try: () =>
        Promise.all(
          params.accountIds
            .slice(1)
            .map((accountId) => client.socialAccounts.retrieve(accountId))
        ),
      catch: (cause) =>
        new SocialConnectCallbackError({ code: "account_fetch_failed", cause }),
    });

    const accounts = [firstAccount, ...remainingAccounts];
    const stateAccounts = accounts.filter(
      (account) => account.external_id === state
    );
    if (stateAccounts.length < accounts.length) {
      yield* Effect.logWarning(
        "Ignoring callback accounts that do not match the connect state"
      );
    }

    yield* clearProviderAccountTags(
      clientPlatform,
      stateAccounts.map((account) => account.id)
    );

    if (oauthState.platform === "linkedin" && stateAccounts.length > 1) {
      const selectionToken = yield* stashLinkedInSelection(
        oauthState,
        stateAccounts
      );
      const selectionResult: CompleteSocialConnectResult = {
        callbackPath: oauthState.callbackPath,
        platform: oauthState.platform,
        selectionToken,
      };
      return selectionResult;
    }

    for (const account of stateAccounts) {
      const platform =
        fromProviderPlatform(account.platform) ?? oauthState.platform;
      const details = yield* buildAccountDetails(platform, account);
      yield* upsertConnectedAccount({
        organizationId: oauthState.organizationId,
        platform,
        providerAccountId: account.id,
        ...details,
      });
    }

    const result: CompleteSocialConnectResult = {
      callbackPath: oauthState.callbackPath,
      platform: oauthState.platform,
    };
    return result;
  }
);

const stashLinkedInSelection = Effect.fn("stashLinkedInSelection")(function* (
  oauthState: SocialConnectOAuthState,
  accounts: SocialAccount[]
) {
  const redisClient = redis;
  if (!redisClient) {
    return yield* Effect.fail(
      new SocialConnectCallbackError({ code: "callback_failed" })
    );
  }

  const selectionToken = crypto.randomUUID();
  const stash: LinkedInSelectionStash = {
    organizationId: oauthState.organizationId,
    userId: oauthState.userId,
    callbackPath: oauthState.callbackPath,
    accounts: accounts.map((account) => ({
      providerAccountId: account.id,
      username: account.username ?? account.user_id,
      profileImageUrl: account.profile_photo_url,
      connectionType: getLinkedInConnectionType(account.metadata),
      profileUrl: getLinkedInProfileUrl(account.metadata),
    })),
  };

  yield* Effect.tryPromise({
    try: () =>
      redisClient.set(
        getLinkedInSelectionKey(selectionToken),
        JSON.stringify(stash),
        { ex: SOCIAL_CONNECT_STATE_TTL_SECONDS }
      ),
    catch: (cause) =>
      new SocialConnectCallbackError({ code: "callback_failed", cause }),
  });

  return selectionToken;
});

const clearProviderAccountTags = Effect.fn("clearProviderAccountTags")(
  function* (clientPlatform: SocialConnectPlatform, accountIds: string[]) {
    yield* Effect.tryPromise({
      try: () =>
        Promise.all(
          accountIds.map((accountId) =>
            clearProviderAccountExternalId(clientPlatform, accountId)
          )
        ),
      catch: (cause) =>
        new SocialConnectRequestError({
          message: "Failed to reset connected account tags",
          cause,
        }),
    }).pipe(
      Effect.catch((error) =>
        Effect.logWarning(
          `Failed to reset connected account tags: ${error.message}`
        )
      )
    );
  }
);

export const upsertConnectedAccount = Effect.fn("upsertConnectedAccount")(
  function* (input: {
    organizationId: string;
    platform: SocialConnectPlatform;
    providerAccountId: string;
    username: string;
    displayName: string;
    profileImageUrl: string | null;
    verified: boolean;
    verifiedType: string | null;
  }) {
    yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const existing = await tx.query.connectedSocialAccounts.findFirst({
            columns: { id: true },
            where: and(
              eq(connectedSocialAccounts.organizationId, input.organizationId),
              eq(connectedSocialAccounts.provider, input.platform),
              eq(
                connectedSocialAccounts.providerAccountId,
                input.providerAccountId
              )
            ),
          });

          if (existing) {
            await tx
              .update(connectedSocialAccounts)
              .set({
                username: input.username,
                displayName: input.displayName,
                profileImageUrl: input.profileImageUrl,
                verified: input.verified,
                verifiedType: input.verifiedType,
              })
              .where(eq(connectedSocialAccounts.id, existing.id));
            return;
          }

          const reconnected = await tx.query.connectedSocialAccounts.findFirst({
            columns: { id: true },
            where: and(
              eq(connectedSocialAccounts.organizationId, input.organizationId),
              eq(connectedSocialAccounts.provider, input.platform),
              eq(connectedSocialAccounts.username, input.username)
            ),
          });

          if (reconnected) {
            await tx
              .update(connectedSocialAccounts)
              .set({
                providerAccountId: input.providerAccountId,
                username: input.username,
                displayName: input.displayName,
                profileImageUrl: input.profileImageUrl,
                verified: input.verified,
                verifiedType: input.verifiedType,
              })
              .where(eq(connectedSocialAccounts.id, reconnected.id));
            return;
          }

          await tx
            .insert(connectedSocialAccounts)
            .values({
              id: crypto.randomUUID(),
              organizationId: input.organizationId,
              provider: input.platform,
              providerAccountId: input.providerAccountId,
              username: input.username,
              displayName: input.displayName,
              profileImageUrl: input.profileImageUrl,
              verified: input.verified,
              verifiedType: input.verifiedType,
            })
            .onConflictDoNothing();
        }),
      catch: (cause) =>
        new SocialConnectCallbackError({ code: "callback_failed", cause }),
    });
  }
);

export const disconnectProviderAccount = Effect.fn("disconnectProviderAccount")(
  function* (accountId: string, platform: SocialConnectPlatform) {
    if (!isSocialConnectConfigured()) {
      return;
    }

    yield* Effect.tryPromise({
      try: () =>
        getSocialConnectClient(platform).socialAccounts.disconnect(accountId),
      catch: (cause) =>
        new SocialConnectRequestError({
          message: "Failed to disconnect account",
          cause,
        }),
    }).pipe(
      Effect.catch((error) =>
        getSocialConnectStatusCode(error.cause) === 404
          ? Effect.void
          : Effect.fail(error)
      )
    );
  }
);
