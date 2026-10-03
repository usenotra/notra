import { recordDemoPublishedPost } from "@notra/ai/utils/demo-social";
import { db } from "@notra/db/drizzle";
import { connectedSocialAccounts } from "@notra/db/schema";
import { socialConnectPlatformSchema } from "@notra/schemas/dashboard/social-accounts";
import { isDemoMode } from "@notra/utils/demo-mode";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import type { SocialPostResult } from "post-for-me/resources/social-post-results";

import { recordPublishedSocialPost } from "@/lib/analytics/record-post";
import {
  getSocialConnectClient,
  isSocialConnectConfigured,
} from "@/lib/social-connect/client";
import {
  SocialConnectConfigError,
  SocialConnectRequestError,
} from "@/lib/social-connect/errors";
import type { PublishSocialPostParams } from "@/types/services/social-connect";

const RESULT_POLL_ATTEMPTS = 5;
const RESULT_POLL_DELAY = "2 seconds";

function getResultErrorMessage(result: SocialPostResult): string {
  const { error } = result;
  if (typeof error === "string" && error) {
    return error;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message
  ) {
    return error.message;
  }
  return "The platform rejected the post";
}

/**
 * The demo's accounts are fictional: publishing succeeds without reaching a
 * platform and the post shows up in analytics with generated stats, so the
 * flow can be tried end to end.
 */
const publishDemoPost = Effect.fn("publishDemoPost")(function* (
  params: PublishSocialPostParams
) {
  const account = yield* Effect.tryPromise({
    try: () =>
      db.query.connectedSocialAccounts.findFirst({
        columns: { provider: true, providerAccountId: true, username: true },
        where: and(
          eq(connectedSocialAccounts.id, params.accountId),
          eq(connectedSocialAccounts.organizationId, params.organizationId)
        ),
      }),
    catch: (cause) =>
      new SocialConnectRequestError({
        message: "Failed to load connected account",
        cause,
      }),
  });
  if (!account) {
    return yield* Effect.fail(
      new SocialConnectRequestError({
        message: "Connected account not found",
        cause: null,
      })
    );
  }
  const platformPostId = `demo-${crypto.randomUUID()}`;
  yield* Effect.tryPromise({
    try: () =>
      recordDemoPublishedPost(params.organizationId, {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        platformPostId,
        content: params.content,
        postedAt: new Date().toISOString(),
      }),
    catch: (cause) =>
      new SocialConnectRequestError({
        message: "Failed to publish post",
        cause,
      }),
  });
  return {
    postId: platformPostId,
    platformPostId,
    postUrl: null,
    username: account.username,
    platform: account.provider,
  };
});

export const publishSocialPost = Effect.fn("publishSocialPost")(function* (
  params: PublishSocialPostParams
) {
  if (isDemoMode()) {
    return yield* publishDemoPost(params);
  }
  if (!isSocialConnectConfigured()) {
    return yield* Effect.fail(
      new SocialConnectConfigError({
        message: "Social account linking is not configured",
      })
    );
  }

  const account = yield* Effect.tryPromise({
    try: () =>
      db.query.connectedSocialAccounts.findFirst({
        columns: { provider: true, providerAccountId: true, username: true },
        where: and(
          eq(connectedSocialAccounts.id, params.accountId),
          eq(connectedSocialAccounts.organizationId, params.organizationId)
        ),
      }),
    catch: (cause) =>
      new SocialConnectRequestError({
        message: "Failed to load connected account",
        cause,
      }),
  });

  if (!account) {
    return yield* Effect.fail(
      new SocialConnectRequestError({
        message: "Connected account not found",
        cause: null,
      })
    );
  }

  const parsedPlatform = socialConnectPlatformSchema.safeParse(
    account.provider
  );
  if (!parsedPlatform.success) {
    return yield* Effect.fail(
      new SocialConnectRequestError({
        message: "This account's platform is not supported",
        cause: null,
      })
    );
  }
  const client = getSocialConnectClient(parsedPlatform.data);

  const post = yield* Effect.tryPromise({
    try: () =>
      client.socialPosts.create({
        caption: params.content,
        social_accounts: [account.providerAccountId],
      }),
    catch: (cause) =>
      new SocialConnectRequestError({
        message: "Failed to publish post",
        cause,
      }),
  });

  let postResult: SocialPostResult | null = null;
  for (let attempt = 0; attempt < RESULT_POLL_ATTEMPTS; attempt += 1) {
    yield* Effect.sleep(RESULT_POLL_DELAY);
    const results = yield* Effect.tryPromise({
      try: () => client.socialPostResults.list({ post_id: [post.id] }),
      catch: (cause) =>
        new SocialConnectRequestError({
          message: "Failed to load published post",
          cause,
        }),
    }).pipe(Effect.catch(() => Effect.succeed(null)));

    postResult = results?.data.at(0) ?? null;
    if (postResult) {
      break;
    }
  }

  if (postResult && !postResult.success) {
    return yield* Effect.fail(
      new SocialConnectRequestError({
        message: getResultErrorMessage(postResult),
        cause: null,
      })
    );
  }

  const platformPostId = postResult?.platform_data?.id ?? null;
  const platformPostUrl = postResult?.platform_data?.url ?? null;
  const postUrl =
    platformPostUrl ??
    (platformPostId && account.provider === "twitter"
      ? `https://x.com/${account.username}/status/${platformPostId}`
      : null);

  if (platformPostId) {
    yield* Effect.promise(() =>
      recordPublishedSocialPost({
        organizationId: params.organizationId,
        accountId: params.accountId,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        platformPostId,
        url: postUrl,
        content: params.content,
      })
    );
  }

  return {
    postId: post.id,
    platformPostId,
    postUrl,
    username: account.username,
    platform: account.provider,
  };
});
