import { redirect } from "@tanstack/react-router";
import {
  getConfig,
  selectStalePKCEVerifierCookieNames,
  sessionEncryption,
  type Session,
} from "@workos/authkit-session";
import {
  getAuthkit,
  getAuthKitContext,
} from "@workos/authkit-tanstack-react-start";

import type { SignOutActionOptions } from "@/types/auth/user-actions";

export async function createAuthSignInUrl() {
  const context = getAuthKitContext();
  const authkit = await getAuthkit();
  const result = await authkit.createSignIn(undefined, {
    redirectUri: context.redirectUri,
  });
  const cookieNames = (context.request.headers.get("cookie") ?? "")
    .split(";")
    .map((cookie) => cookie.slice(0, cookie.indexOf("=")).trim())
    .filter(Boolean);
  const stale = selectStalePKCEVerifierCookieNames(cookieNames, {
    keep: result.cookieName,
  });
  await Promise.allSettled(
    stale.map((cookieName) =>
      authkit.clearPendingVerifierByName(undefined, {
        cookieName,
        redirectUri: context.redirectUri,
      })
    )
  );
  return result.url;
}

export async function signOutAuthSession(options?: SignOutActionOptions) {
  const auth = getAuthKitContext().auth();
  if (!auth.user || !auth.sessionId) {
    throw redirect({ href: options?.returnTo || "/", reloadDocument: true });
  }
  const authkit = await getAuthkit();
  const { logoutUrl } = await authkit.signOut(auth.sessionId, options);
  throw redirect({ href: logoutUrl, reloadDocument: true });
}

export async function saveAuthSession(session: Session) {
  getAuthKitContext();
  const encrypted = await sessionEncryption.sealData(session, {
    password: getConfig("cookiePassword"),
    ttl: 0,
  });
  const authkit = await getAuthkit();
  await authkit.saveSession(undefined, encrypted);
}
