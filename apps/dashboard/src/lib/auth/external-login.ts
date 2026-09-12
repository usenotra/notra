import { externalLoginCompleteResponseSchema } from "@notra/schemas/dashboard/auth/external-login";
import { Effect } from "effect";

import { WorkOSAuthError } from "@/lib/auth/errors";
import { readWorkOSError } from "@/lib/auth/workos-error";
import type { SessionUser } from "@/types/auth/session";

const COMPLETE_ENDPOINT = "https://api.workos.com/authkit/oauth2/complete";
const NAME_SPLIT_REGEX = /\s+/;

export const completeExternalLogin = Effect.fn("auth.external.complete")(
  function* (externalAuthId: string, user: SessionUser) {
    const [firstName, ...rest] = user.name.trim().split(NAME_SPLIT_REGEX);

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(COMPLETE_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WORKOS_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            external_auth_id: externalAuthId,
            user: {
              id: user.id,
              email: user.email,
              first_name: firstName || undefined,
              last_name: rest.join(" ") || undefined,
            },
          }),
        }),
      catch: (error) => new WorkOSAuthError({ error }),
    });

    const payload = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (error) => new WorkOSAuthError({ error }),
    });

    if (!response.ok) {
      return yield* Effect.fail(new WorkOSAuthError({ error: payload }));
    }

    const parsed = externalLoginCompleteResponseSchema.safeParse(payload);

    if (!parsed.success) {
      return yield* Effect.fail(new WorkOSAuthError({ error: payload }));
    }

    return parsed.data.redirect_uri;
  }
);

export function describeExternalLoginError(error: unknown) {
  if (error instanceof WorkOSAuthError) {
    return readWorkOSError(error.error).message;
  }
  return "External login completion failed";
}
