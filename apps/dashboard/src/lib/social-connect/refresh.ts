import { db } from "@notra/db/drizzle";
import { connectedSocialAccounts } from "@notra/db/schema";
import { socialConnectPlatformSchema } from "@notra/schemas/dashboard/social-accounts";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import type { SocialAccount } from "post-for-me/resources/social-accounts";

import { normalizeTwitterProfileImageUrl } from "@/constants/twitter";
import {
  getSocialConnectClient,
  hasProviderPremium,
  isSocialConnectConfigured,
} from "@/lib/social-connect/client";
import {
  getSocialConnectStatusCode,
  SocialConnectConfigError,
  SocialConnectRequestError,
} from "@/lib/social-connect/errors";
import type { RefreshedAccountStatus } from "@/types/services/social-connect";
import { fetchTwitterVerification } from "@/utils/twitter-fetcher";

export const refreshConnectedAccounts = Effect.fn("refreshConnectedAccounts")(
  function* (organizationId: string, accountId?: string) {
    if (!isSocialConnectConfigured()) {
      return yield* Effect.fail(
        new SocialConnectConfigError({
          message: "Social account linking is not configured",
        })
      );
    }

    const rows = yield* Effect.tryPromise({
      try: () =>
        db.query.connectedSocialAccounts.findMany({
          where: accountId
            ? and(
                eq(connectedSocialAccounts.organizationId, organizationId),
                eq(connectedSocialAccounts.id, accountId)
              )
            : eq(connectedSocialAccounts.organizationId, organizationId),
        }),
      catch: (cause) =>
        new SocialConnectRequestError({
          message: "Failed to load connected accounts",
          cause,
        }),
    });

    if (accountId && rows.length === 0) {
      return yield* Effect.fail(
        new SocialConnectRequestError({
          message: "Account not found",
          cause: null,
        })
      );
    }

    const results: RefreshedAccountStatus[] = [];

    for (const row of rows) {
      const parsedPlatform = socialConnectPlatformSchema.safeParse(
        row.provider
      );
      if (!parsedPlatform.success) {
        results.push({ username: row.username, status: "missing" });
        continue;
      }
      const client = getSocialConnectClient(parsedPlatform.data);

      const match = yield* Effect.tryPromise({
        try: (): Promise<SocialAccount> =>
          client.socialAccounts.retrieve(row.providerAccountId),
        catch: (cause) =>
          new SocialConnectRequestError({
            message: "Failed to load account from provider",
            cause,
          }),
      }).pipe(
        Effect.catch((error) =>
          getSocialConnectStatusCode(error.cause) === 404
            ? Effect.succeed(null)
            : Effect.fail(error)
        )
      );

      if (!match || match.status === "disconnected") {
        results.push({ username: row.username, status: "missing" });
        continue;
      }

      const username = match.username ?? row.username;
      const rawProfileImageUrl = match.profile_photo_url ?? row.profileImageUrl;
      let profileImageUrl =
        rawProfileImageUrl && row.provider === "twitter"
          ? normalizeTwitterProfileImageUrl(rawProfileImageUrl)
          : rawProfileImageUrl;

      let displayName = row.displayName;
      let verifiedType = row.verifiedType;
      if (row.provider === "twitter") {
        const verification = yield* fetchTwitterVerification(username).pipe(
          Effect.catch(() => Effect.succeed(null))
        );
        displayName = verification?.name ?? displayName;
        profileImageUrl = verification?.profileImageUrl ?? profileImageUrl;
        verifiedType =
          verification?.verifiedType ??
          verifiedType ??
          (hasProviderPremium(match.metadata) ? "blue" : null);
      }
      const verified = verifiedType !== null && verifiedType !== "none";

      yield* Effect.tryPromise({
        try: () =>
          db
            .update(connectedSocialAccounts)
            .set({
              providerAccountId: match.id,
              username,
              displayName,
              profileImageUrl,
              verified,
              verifiedType,
            })
            .where(eq(connectedSocialAccounts.id, row.id)),
        catch: (cause) =>
          new SocialConnectRequestError({
            message: "Failed to update connected account",
            cause,
          }),
      });

      results.push({ username, status: "updated" });
    }

    return { accounts: results };
  }
);
