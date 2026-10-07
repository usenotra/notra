import { redirect } from "@tanstack/react-router";
import { Effect } from "effect";

import {
  completeExternalLogin,
  describeExternalLoginError,
} from "@/lib/auth/external-login";
import { getAuthSession } from "@/lib/auth/server";

export async function GET(request: Request) {
  const externalAuthId = new URL(request.url).searchParams.get(
    "external_auth_id"
  );

  if (!externalAuthId) {
    throw redirect({ href: "/login" });
  }

  const session = await getAuthSession();

  if (!session) {
    const returnTo = `/auth/external?external_auth_id=${encodeURIComponent(externalAuthId)}`;
    throw redirect({ href: `/login?returnTo=${encodeURIComponent(returnTo)}` });
  }

  const outcome = await Effect.runPromise(
    completeExternalLogin(externalAuthId, session.user).pipe(
      Effect.map((redirectUri) => ({ redirectUri, error: null })),
      Effect.catch((error) =>
        Effect.logWarning("External login completion failed").pipe(
          Effect.annotateLogs({
            userId: session.user.id,
            error: describeExternalLoginError(error),
          }),
          Effect.as({ redirectUri: null, error: "external-login-failed" })
        )
      )
    )
  );

  if (!outcome.redirectUri) {
    throw redirect({ href: "/login?error=external-login-failed" });
  }

  throw redirect({ href: outcome.redirectUri });
}
