import { createServerFn } from "@tanstack/react-start";

const startSocialSignInServerFn = createServerFn({ method: "POST" })
  .validator((data: Parameters<typeof startSocialSignInActionImpl>) => data)
  .handler(({ data }) => startSocialSignInActionImpl(...data));
export const startSocialSignInAction = (
  ...data: Parameters<typeof startSocialSignInActionImpl>
) => startSocialSignInServerFn({ data });

import { startSocialSignInInputSchema } from "@notra/schemas/dashboard/auth/social";
import type { StartSocialSignInInput } from "@notra/schemas/types/dashboard/auth";
import { isDemoMode } from "@notra/utils/demo-mode";
import { redirect } from "@tanstack/react-router";
import { getRequestHeaders, setCookie } from "@tanstack/react-start/server";
import { getWorkOS } from "@workos/authkit-session";

import {
  SOCIAL_AUTH_CALLBACK_PATH,
  SOCIAL_AUTH_PROVIDERS,
  SOCIAL_AUTH_STATE_COOKIE,
  SOCIAL_AUTH_STATE_MAX_AGE_SECONDS,
} from "@/constants/social-auth";
import { sanitizeReturnTo } from "@/lib/auth/return-to";
import { getClientIpFromHeaders, ratelimit } from "@/utils/ratelimit";

async function startSocialSignInActionImpl(rawInput: StartSocialSignInInput) {
  const parsed = startSocialSignInInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    throw redirect({ href: "/login" });
  }

  const input = parsed.data;

  // The demo has no WorkOS client; the UI explains this before calling, so
  // just send the visitor back instead of failing with a 500.
  if (isDemoMode()) {
    throw redirect({ href: sanitizeReturnTo(input.returnTo ?? null) ?? "/" });
  }

  const mappedProvider = SOCIAL_AUTH_PROVIDERS[input.provider];

  if (!mappedProvider) {
    throw redirect({ href: "/login" });
  }

  const headersList = getRequestHeaders();
  const { success } = await ratelimit.socialSignInStart.limit(
    getClientIpFromHeaders(headersList)
  );

  if (!success) {
    throw redirect({ href: "/login?error=social-sign-in-failed" });
  }

  const returnTo = sanitizeReturnTo(input.returnTo ?? null);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const nonce = crypto.randomUUID();
  setCookie(SOCIAL_AUTH_STATE_COOKIE, nonce, {
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

  throw redirect({ href: url });
}
