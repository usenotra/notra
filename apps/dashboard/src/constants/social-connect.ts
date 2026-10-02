import type { SocialConnectPlatform } from "@notra/schemas/dashboard/social-accounts";

import { LINKEDIN_DUPLICATE_POST_DOCS_URL } from "@/constants/linkedin";
import { TWITTER_DUPLICATE_POST_DOCS_URL } from "@/constants/twitter";

export const SOCIAL_PLATFORM_LABELS: Record<SocialConnectPlatform, string> = {
  twitter: "X",
  linkedin: "LinkedIn",
};

export const SOCIAL_CONNECTED_PARAMS: Record<SocialConnectPlatform, string> = {
  twitter: "twitterConnected",
  linkedin: "linkedinConnected",
};

export const SOCIAL_CONNECT_STATE_TTL_SECONDS = 600;

export const SOCIAL_CONNECT_ERROR_CODES = [
  "invalid_callback",
  "expired_state",
  "connection_failed",
  "account_fetch_failed",
  "callback_failed",
  "state_mismatch",
] as const;

export const DUPLICATE_POST_DOCS_URLS: Record<SocialConnectPlatform, string> = {
  linkedin: LINKEDIN_DUPLICATE_POST_DOCS_URL,
  twitter: TWITTER_DUPLICATE_POST_DOCS_URL,
};

export const SOCIAL_DUPLICATE_CONTENT_REGEX = /already scheduled|duplicate/i;

export const SOCIAL_DUPLICATE_CONTENT_CODE = "duplicate_content";

/**
 * Prefix marking PostForMe `external_id`s created by Notra. Mutations
 * (edit/cancel) only touch posts carrying this marker, so one org cannot
 * alter another integration's scheduled posts by id.
 */
export const SOCIAL_POST_EXTERNAL_ID_PREFIX = "notra:";
