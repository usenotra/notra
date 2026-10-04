import { handleCallbackRoute } from "@workos/authkit-tanstack-react-start";
import { Effect } from "effect";

import { syncAuthenticatedUser } from "@/lib/auth/sync";

export const GET = handleCallbackRoute({
  returnPathname: "/callback",
  onSuccess: async ({ user, oauthTokens, authenticationMethod }) => {
    await Effect.runPromise(
      syncAuthenticatedUser({
        workosUser: user,
        oauthTokens:
          oauthTokens && typeof oauthTokens.accessToken === "string"
            ? {
                accessToken: oauthTokens.accessToken,
                refreshToken: oauthTokens.refreshToken,
                expiresAt: oauthTokens.expiresAt,
                scopes: oauthTokens.scopes,
              }
            : undefined,
        authenticationMethod,
      })
    );
  },
});
