import {
  exchangeGscAuthorizationCode,
  fetchGscAccountEmail,
  GscDisconnectInProgressError,
  getGscIntegration,
  getGscOAuthCredentials,
  upsertGscIntegration,
} from "@notra/ai/integrations/google-search-console";
import {
  GscIntegrationLockLostError,
  withGscIntegrationLock,
} from "@notra/ai/utils/gsc-integration-lock";
import { redis } from "@notra/ai/utils/redis";
import {
  GSC_OAUTH_CALLBACK_PATH,
  GSC_OAUTH_STATE_KEY_PREFIX,
  GSC_OAUTH_STATE_TTL_SECONDS,
} from "@notra/geo-core/constants/google-search-console";
import type { GscOAuthState } from "@notra/geo-core/types/google-search-console";
import { buildCallbackUrl } from "@notra/utils/callback-url";
import { ORPCError } from "@orpc/server";

import { redirectResponse } from "@/lib/auth/http";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { getServerSession } from "@/lib/auth/session";
import { gscOAuthErrorParam } from "@/lib/integrations/google-search-console/oauth-errors";
import { getGscRedirectUri } from "@/lib/integrations/google-search-console/redirect-uri";

export async function GET(request: Request) {
  const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  let restoreOAuthState: (() => Promise<void>) | null = null;
  let callbackPath = "/";

  try {
    const requestUrl = new URL(request.url);
    const baseOrigin = baseUrl ? new URL(baseUrl).host : null;
    const forwardedHost =
      request.headers.get("x-forwarded-host") ?? requestUrl.host;
    if (baseOrigin && forwardedHost !== baseOrigin) {
      return redirectResponse(
        `${baseUrl}${GSC_OAUTH_CALLBACK_PATH}${requestUrl.search}`
      );
    }

    const { searchParams } = requestUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (!(state && redis)) {
      return redirectResponse(`${baseUrl}/?error=invalid_callback`);
    }

    const stateKey = `${GSC_OAUTH_STATE_KEY_PREFIX}${state}`;
    const remainingTtlSeconds = await redis.ttl(stateKey);
    const raw = await redis.getdel<string>(stateKey);
    if (!raw) {
      return redirectResponse(`${baseUrl}/?error=gsc_expired_state`);
    }

    const restoreTtlSeconds = Math.min(
      remainingTtlSeconds,
      GSC_OAUTH_STATE_TTL_SECONDS
    );
    const activeRedis = redis;
    restoreOAuthState = async () => {
      if (restoreTtlSeconds <= 0) {
        return;
      }
      try {
        await activeRedis.set(
          stateKey,
          typeof raw === "string" ? raw : JSON.stringify(raw),
          { ex: restoreTtlSeconds }
        );
      } catch (restoreError) {
        console.error(
          "Failed to restore Google Search Console OAuth state:",
          restoreError
        );
      }
    };

    const oauthState: GscOAuthState =
      typeof raw === "string" ? JSON.parse(raw) : raw;
    callbackPath = oauthState.callbackPath;

    if (error) {
      return redirectResponse(
        buildCallbackUrl(baseUrl, callbackPath, {
          error:
            error === "access_denied" ? "gsc_access_denied" : "gsc_auth_failed",
        })
      );
    }

    if (!code) {
      return redirectResponse(
        buildCallbackUrl(baseUrl, callbackPath, {
          error: "gsc_invalid_callback",
        })
      );
    }

    const { session, user } = await getServerSession({
      headers: request.headers,
    });
    if (!session?.userId || session.userId !== oauthState.userId) {
      await restoreOAuthState();
      return redirectResponse(
        buildCallbackUrl(baseUrl, callbackPath, {
          error: "gsc_session_mismatch",
        })
      );
    }

    try {
      await assertOrganizationAccess({
        headers: request.headers,
        organizationId: oauthState.organizationId,
        user,
      });
    } catch (accessError) {
      if (accessError instanceof ORPCError) {
        await restoreOAuthState();
        return redirectResponse(
          buildCallbackUrl(baseUrl, callbackPath, {
            error: gscOAuthErrorParam(accessError.status, "gsc_forbidden"),
          })
        );
      }
      throw accessError;
    }

    if (!getGscOAuthCredentials()) {
      await restoreOAuthState();
      return redirectResponse(
        buildCallbackUrl(baseUrl, callbackPath, {
          error: "gsc_not_configured",
        })
      );
    }

    // Set once the integration row is committed. A lease lost after that
    // point only affects best-effort cleanup, not the stored connection.
    let connectionCommitted = false;
    const connect = withGscIntegrationLock(
      oauthState.organizationId,
      async (signal, assertLockOwned) => {
        const currentIntegration = await getGscIntegration(
          oauthState.organizationId
        );
        if (currentIntegration?.disconnectingAt) {
          throw new GscDisconnectInProgressError();
        }

        let tokens: Awaited<ReturnType<typeof exchangeGscAuthorizationCode>>;
        try {
          tokens = await exchangeGscAuthorizationCode({
            code,
            redirectUri: getGscRedirectUri(baseUrl),
            signal,
          });
        } catch (exchangeError) {
          signal.throwIfAborted();
          console.error(
            "Google Search Console token exchange failed:",
            exchangeError
          );
          return "token_exchange_failed" as const;
        }

        if (!tokens.refreshToken) {
          return "missing_refresh_token" as const;
        }

        const googleAccountEmail = await fetchGscAccountEmail(
          tokens.accessToken,
          signal
        );

        await upsertGscIntegration(
          {
            organizationId: oauthState.organizationId,
            userId: oauthState.userId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            googleAccountEmail,
          },
          signal,
          assertLockOwned
        );
        connectionCommitted = true;
        return "connected" as const;
      }
    );
    const connectResult = await connect.catch((error: unknown) => {
      if (error instanceof GscIntegrationLockLostError && connectionCommitted) {
        console.error(
          "[GSC] Integration lock lost after the connection was saved:",
          error
        );
        return "connected" as const;
      }
      throw error;
    });

    if (connectResult === "token_exchange_failed") {
      await restoreOAuthState();
      return redirectResponse(
        buildCallbackUrl(baseUrl, callbackPath, {
          error: "gsc_token_exchange_failed",
        })
      );
    }

    if (connectResult === "missing_refresh_token") {
      return redirectResponse(
        buildCallbackUrl(baseUrl, callbackPath, {
          error: "gsc_missing_refresh_token",
        })
      );
    }

    return redirectResponse(
      buildCallbackUrl(baseUrl, callbackPath, { gscConnected: "true" })
    );
  } catch (error) {
    await restoreOAuthState?.();
    if (error instanceof GscDisconnectInProgressError) {
      return redirectResponse(
        buildCallbackUrl(baseUrl, callbackPath, {
          error: "gsc_disconnect_in_progress",
        })
      );
    }
    console.error("Error in Google Search Console OAuth callback:", error);
    return redirectResponse(
      buildCallbackUrl(baseUrl, callbackPath, { error: "gsc_auth_failed" })
    );
  }
}
