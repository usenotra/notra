"use server";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { startPasskeySignInInputSchema } from "@notra/schemas/dashboard/auth/mfa";
import type { StartPasskeySignInInput } from "@notra/ui/lib/auth-types";
import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

import { ANALYTICS_AUTH_METHODS } from "@/constants/analytics-events";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { readRequestHeaders } from "@/lib/analytics/request-headers";
import { sanitizeReturnTo } from "@/lib/auth/return-to";

const DEFAULT_POST_LOGIN_PATH = "/callback";

/**
 * WorkOS only supports passkey sign-in through the hosted AuthKit UI, so this
 * hands the user to AuthKit and lets the regular `/auth/callback` route finish
 * the session.
 */
export async function startPasskeySignInAction(
  rawInput: StartPasskeySignInInput
): Promise<void> {
  const parsed = startPasskeySignInInputSchema.safeParse(rawInput);
  const requestedReturnTo = parsed.success
    ? (parsed.data.returnTo ?? null)
    : null;
  const returnTo =
    sanitizeReturnTo(requestedReturnTo) ?? DEFAULT_POST_LOGIN_PATH;

  const requestHeaders = await readRequestHeaders();
  trackServerEvent({
    event: POSTHOG_EVENTS.PASSKEY_SIGN_IN_STARTED,
    headers: requestHeaders,
    userId: null,
    properties: { method: ANALYTICS_AUTH_METHODS.PASSKEY },
  });

  const signInUrl = await getSignInUrl({ returnTo });
  redirect(signInUrl);
}
