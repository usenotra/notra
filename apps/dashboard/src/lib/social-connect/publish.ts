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
  isSocialConnectPlatformConfigured,
} from "@/lib/social-connect/client";
import {
  SocialConnectConfigError,
  SocialConnectRequestError,
} from "@/lib/social-connect/errors";
import { assertAllowedSocialMediaUrls } from "@/lib/social-connect/media-urls";
import { assertOwnExternalId } from "@/lib/social-connect/scheduled";
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
  // Demo posts publish immediately — accepting a schedule would persist a
  // schedule ref for a provider schedule that was never created.
  if (params.scheduledAt) {
    return yield* Effect.fail(
      new SocialConnectRequestError({
        message: "Scheduling is not available in demo mode",
        cause: null,
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
    scheduledAt: null,
    status: "processed" as const,
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
  // The global check above passes when either platform key exists — verify
  // this account's platform key before constructing its client.
  if (!isSocialConnectPlatformConfigured(parsedPlatform.data)) {
    return yield* Effect.fail(
      new SocialConnectConfigError({
        message: "Social account linking is not configured",
      })
    );
  }
  const client = getSocialConnectClient(parsedPlatform.data);

  if (params.scheduledAt) {
    const scheduledTime = Date.parse(params.scheduledAt);
    if (Number.isNaN(scheduledTime) || scheduledTime <= Date.now()) {
      return yield* Effect.fail(
        new SocialConnectRequestError({
          message: "Scheduled time must be in the future",
          cause: null,
        })
      );
    }
  }

  if (params.externalId) {
    yield* assertOwnExternalId(params.externalId, params.accountId);
  }

  try {
    assertAllowedSocialMediaUrls(params.mediaUrls, params.organizationId);
  } catch (error) {
    return yield* Effect.fail(error as SocialConnectRequestError);
  }

  const post = yield* Effect.tryPromise({
    try: () =>
      client.socialPosts.create({
        caption: params.content,
        social_accounts: [account.providerAccountId],
        ...(params.mediaUrls?.length
          ? { media: params.mediaUrls.map((url) => ({ url })) }
          : {}),
        ...(params.scheduledAt ? { scheduled_at: params.scheduledAt } : {}),
        ...(params.externalId ? { external_id: params.externalId } : {}),
      }),
    catch: (cause) =>
      new SocialConnectRequestError({
        message: "Failed to publish post",
        cause,
      }),
  });

  if (params.scheduledAt) {
    return {
      postId: post.id,
      platformPostId: null,
      postUrl: null,
      username: account.username,
      platform: account.provider,
      scheduledAt: params.scheduledAt,
      status: "scheduled" as const,
    };
  }

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
        // Retain the provider result: `cause === null` is reserved for own
        // validation failures, and the mapper needs the cause to apply
        // duplicate-content/status handling instead of raw text.
        cause: postResult,
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
    scheduledAt: null,
    status: "processed" as const,
  };
});
