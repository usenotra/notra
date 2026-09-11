"use server";

import { startSocialSignInInputSchema } from "@notra/schemas/dashboard/auth/social";
import type { StartSocialSignInInput } from "@notra/ui/lib/auth-types";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  SOCIAL_AUTH_CALLBACK_PATH,
  SOCIAL_AUTH_PROVIDERS,
  SOCIAL_AUTH_STATE_COOKIE,
  SOCIAL_AUTH_STATE_MAX_AGE_SECONDS,
} from "@/constants/social-auth";
import { sanitizeReturnTo } from "@/lib/auth/return-to";
import { getClientIpFromHeaders, ratelimit } from "@/utils/ratelimit";

export async function startSocialSignInAction(
  rawInput: StartSocialSignInInput
) {
  const parsed = startSocialSignInInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    redirect("/login");
  }

  const input = parsed.data;
  const mappedProvider = SOCIAL_AUTH_PROVIDERS[input.provider];

  if (!mappedProvider) {
    redirect("/login");
  }

  const headersList = await headers();
  const { success } = await ratelimit.socialSignInStart.limit(
    getClientIpFromHeaders(headersList)
  );

  if (!success) {
    redirect("/login?error=social-sign-in-failed");
  }

  const returnTo = sanitizeReturnTo(input.returnTo ?? null);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const nonce = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(SOCIAL_AUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: appUrl.startsWith("https://"),
    maxAge: SOCIAL_AUTH_STATE_MAX_AGE_SECONDS,
    path: "/",
  });

  const url = getWorkOS().userManagement.getAuthorizationUrl({
    clientId: process.env.WORKOS_CLIENT_ID ?? "",
    provider: mappedProvider,
    redirectUri: `${appUrl}${SOCIAL_AUTH_CALLBACK_PATH}`,
    state: returnTo ? `${nonce}:${returnTo}` : nonce,
  });

  redirect(url);
}
