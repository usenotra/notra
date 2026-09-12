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

export const SOCIAL_CONNECT_ERROR_MESSAGES: Record<string, string> = {
  invalid_callback: "The connection attempt was invalid. Please try again.",
  expired_state: "The connection attempt expired. Please try again.",
  connection_failed: "The account connection was canceled or failed.",
  account_fetch_failed:
    "We could not load the connected account. Please try again.",
  callback_failed:
    "Something went wrong while connecting the account. Please try again.",
  state_mismatch:
    "This connection link was started from a different account. Please start the connection again from your own settings.",
};

export const DUPLICATE_POST_DOCS_URLS: Record<SocialConnectPlatform, string> = {
  linkedin: LINKEDIN_DUPLICATE_POST_DOCS_URL,
  twitter: TWITTER_DUPLICATE_POST_DOCS_URL,
};
