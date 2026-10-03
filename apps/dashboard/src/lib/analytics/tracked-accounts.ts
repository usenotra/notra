import { demoSocialFollowers } from "@notra/analytics/tinybird/demo-social";
import { isDemoMode } from "@notra/utils/demo-mode";

import { normalizeTwitterProfileImageUrl } from "@/constants/twitter";
import type {
  ResolvedTwitterAccount,
  TwitterUserByUsernameResponse,
} from "@/types/analytics";
import { twitterAppFetch } from "@/utils/twitter-fetcher";

const TWITTER_RESOLVE_USER_FIELDS =
  "name,profile_image_url,public_metrics,verified,verified_type";
const LEADING_AT_REGEX = /^@/;

/**
 * The demo never calls X: any handle resolves to a fictional account whose
 * stats the demo generates, so tracking can be tried with any name.
 */
function resolveDemoTwitterAccount(handle: string): ResolvedTwitterAccount {
  const providerAccountId = `demo-x-${handle.toLowerCase()}`;
  const now = new Date();
  return {
    providerAccountId,
    username: handle,
    displayName: handle,
    profileImageUrl: null,
    verified: false,
    verifiedType: "none",
    followersCount: demoSocialFollowers(
      { provider: "twitter", providerAccountId, kind: "tracked" },
      now,
      now
    ),
  };
}

export async function resolveTwitterAccount(
  username: string
): Promise<ResolvedTwitterAccount | null> {
  const handle = username.trim().replace(LEADING_AT_REGEX, "");
  if (handle.length === 0) {
    return null;
  }
  if (isDemoMode()) {
    return resolveDemoTwitterAccount(handle);
  }

  const params = new URLSearchParams({
    "user.fields": TWITTER_RESOLVE_USER_FIELDS,
  });
  const response = await twitterAppFetch(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(handle)}?${params.toString()}`
  );
  if (!response.ok) {
    return null;
  }

  const json: TwitterUserByUsernameResponse = await response.json();
  const user = json.data;
  if (!user?.id) {
    return null;
  }

  const verifiedType = user.verified_type ?? "none";
  return {
    providerAccountId: user.id,
    username: user.username,
    displayName: user.name ?? null,
    profileImageUrl: user.profile_image_url
      ? normalizeTwitterProfileImageUrl(user.profile_image_url)
      : null,
    verified: user.verified === true || verifiedType !== "none",
    verifiedType,
    followersCount: user.public_metrics?.followers_count ?? null,
  };
}
