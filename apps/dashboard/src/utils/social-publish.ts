import type { SocialConnectPlatform } from "@notra/schemas/dashboard/social-accounts";

import {
  DUPLICATE_POST_DOCS_URLS,
  SOCIAL_PLATFORM_LABELS,
} from "@/constants/social-connect";
import type {
  PublishErrorInfo,
  PublishedSocialPost,
} from "@/types/content/post-social";
import type { ConnectedAccount } from "@/types/hooks/connected-accounts";

export function buildPublishedChatMessage(
  published: PublishedSocialPost
): string {
  const label = SOCIAL_PLATFORM_LABELS[published.platform];
  if (published.postUrl) {
    return `I just published this post to ${label} as @${published.username}: ${published.postUrl}`;
  }
  return `I just published this post to ${label} as @${published.username}.`;
}

function hasReconnectCode(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return false;
  }
  const { data } = error;
  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    data.code === "reconnect_required"
  );
}

const DUPLICATE_CONTENT_RE = /already scheduled|duplicate/i;

export function getPublishErrorInfo(
  error: unknown,
  platform?: SocialConnectPlatform
): PublishErrorInfo {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Failed to publish post";
  const isDuplicate = DUPLICATE_CONTENT_RE.test(message);

  return {
    message,
    reconnectRequired: hasReconnectCode(error),
    docsUrl:
      isDuplicate && platform ? DUPLICATE_POST_DOCS_URLS[platform] : null,
  };
}

export function buildReferenceInput(
  platform: "twitter" | "linkedin",
  content: string,
  postUrl: string | null,
  platformPostId: string | null,
  username: string,
  account: ConnectedAccount
) {
  if (platform === "twitter") {
    return {
      type: "twitter_post" as const,
      content,
      sourceUrl: postUrl,
      metadata: {
        tweetId: platformPostId,
        authorHandle: username,
        authorName: account.displayName,
        url: postUrl,
        likes: 0,
        retweets: 0,
        replies: 0,
        profileImageUrl: account.profileImageUrl,
        createdAt: new Date().toISOString(),
      },
      note: null,
      applicableTo: ["twitter" as const],
    };
  }
  return {
    type: "linkedin_post" as const,
    content,
    sourceUrl: postUrl,
    metadata: {
      authorHandle: username,
      authorName: account.displayName,
      url: postUrl,
      profileImageUrl: account.profileImageUrl,
      createdAt: new Date().toISOString(),
    },
    note: null,
    applicableTo: ["linkedin" as const],
  };
}

export function isReferenceLimitError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("reference limit")
  );
}
