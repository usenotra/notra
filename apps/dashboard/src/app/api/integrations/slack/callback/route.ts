import {
  createSlackIntegration,
  getSlackIntegrationByTeamId,
} from "@notra/ai/integrations/slack-workspace";
import { redis } from "@notra/ai/utils/redis";
import { slackOAuthAccessResponseSchema } from "@notra/schemas/dashboard/slack-integration";
import { buildCallbackUrl } from "@notra/utils/callback-url";
import { ORPCError } from "@orpc/server";
import { type NextRequest, NextResponse } from "next/server";

import {
  INTEGRATION_AUTH_KINDS,
  INTEGRATION_PROVIDERS,
} from "@/constants/integration-analytics";
import { SLACK_OAUTH_STATE_TTL_SECONDS } from "@/constants/slack-integration";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { getServerSession } from "@/lib/auth/session";
import {
  trackIntegrationConnected,
  trackIntegrationConnectFailed,
} from "@/lib/integrations/connect-events";
import { slackOAuthErrorParam } from "@/lib/integrations/slack/oauth-errors";
import type { SlackOAuthState } from "@/types/slack-integration";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  let restoreOAuthState: (() => Promise<void>) | null = null;

  try {
    const requestUrl = new URL(request.url);
    const baseOrigin = baseUrl ? new URL(baseUrl).host : null;
    const forwardedHost =
      request.headers.get("x-forwarded-host") ?? requestUrl.host;
    if (baseOrigin && forwardedHost !== baseOrigin) {
      return NextResponse.redirect(
        `${baseUrl}/api/integrations/slack/callback${requestUrl.search}`
      );
    }

    const { searchParams } = requestUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      trackIntegrationConnectFailed({
        headers: request.headers,
        provider: INTEGRATION_PROVIDERS.SLACK,
        authKind: INTEGRATION_AUTH_KINDS.OAUTH,
        errorCode: error,
      });
      return NextResponse.redirect(
        `${baseUrl}/?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state || !redis) {
      trackIntegrationConnectFailed({
        headers: request.headers,
        provider: INTEGRATION_PROVIDERS.SLACK,
        authKind: INTEGRATION_AUTH_KINDS.OAUTH,
        errorCode: "invalid_callback",
      });
      return NextResponse.redirect(`${baseUrl}/?error=invalid_callback`);
    }

    const stateKey = `slack_oauth:${state}`;
    const remainingTtlSeconds = await redis.ttl(stateKey);
    const raw = await redis.getdel<string>(stateKey);
    if (!raw) {
      return NextResponse.redirect(`${baseUrl}/?error=expired_state`);
    }

    const restoreTtlSeconds = Math.min(
      remainingTtlSeconds,
      SLACK_OAUTH_STATE_TTL_SECONDS
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
          "Failed to restore Slack OAuth state for retry:",
          restoreError
        );
      }
    };

    const oauthState: SlackOAuthState =
      typeof raw === "string" ? JSON.parse(raw) : raw;

    const { session, user } = await getServerSession({
      headers: request.headers,
    });
    if (!session?.userId || session.userId !== oauthState.userId) {
      await restoreOAuthState();
      return NextResponse.redirect(`${baseUrl}/?error=session_mismatch`);
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
        return NextResponse.redirect(
          `${baseUrl}/?error=${slackOAuthErrorParam(accessError.status, "forbidden")}`
        );
      }
      throw accessError;
    }

    const clientId = process.env.SLACK_AGENT_CLIENT_ID;
    const clientSecret = process.env.SLACK_AGENT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      await restoreOAuthState();
      return NextResponse.redirect(`${baseUrl}/?error=slack_not_configured`);
    }

    const redirectBaseUrl =
      process.env.SLACK_OAUTH_REDIRECT_BASE_URL?.trim() || baseUrl;
    const redirectUri = `${redirectBaseUrl}/api/integrations/slack/callback`;

    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      console.error(
        "Slack token exchange failed with status:",
        tokenRes.status
      );
      await restoreOAuthState();
      return NextResponse.redirect(`${baseUrl}/?error=token_exchange_failed`);
    }
    const tokenParse = slackOAuthAccessResponseSchema.safeParse(
      await tokenRes.json()
    );
    if (
      !(
        tokenParse.success &&
        tokenParse.data.ok &&
        tokenParse.data.access_token &&
        tokenParse.data.team?.id
      )
    ) {
      console.error(
        "Slack token exchange failed:",
        tokenParse.success ? tokenParse.data.error : "invalid_response"
      );
      await restoreOAuthState();
      trackIntegrationConnectFailed({
        headers: request.headers,
        userId: oauthState.userId,
        organizationId: oauthState.organizationId,
        provider: INTEGRATION_PROVIDERS.SLACK,
        authKind: INTEGRATION_AUTH_KINDS.OAUTH,
        errorCode: "token_exchange_failed",
      });
      return NextResponse.redirect(`${baseUrl}/?error=token_exchange_failed`);
    }

    const { access_token, team, bot_user_id } = tokenParse.data;

    const existing = await getSlackIntegrationByTeamId(team.id);
    if (existing) {
      const existingErrorCode =
        existing.organizationId === oauthState.organizationId
          ? "workspace_already_connected"
          : "workspace_connected_elsewhere";
      trackIntegrationConnectFailed({
        headers: request.headers,
        userId: oauthState.userId,
        organizationId: oauthState.organizationId,
        provider: INTEGRATION_PROVIDERS.SLACK,
        authKind: INTEGRATION_AUTH_KINDS.OAUTH,
        errorCode: existingErrorCode,
      });
      return NextResponse.redirect(
        buildCallbackUrl(baseUrl, oauthState.callbackPath, {
          error: existingErrorCode,
        })
      );
    }

    await createSlackIntegration({
      organizationId: oauthState.organizationId,
      userId: oauthState.userId,
      displayName: team.name ?? "Slack workspace",
      botToken: access_token,
      slackTeamId: team.id,
      slackTeamName: team.name,
      slackBotUserId: bot_user_id,
    });

    trackIntegrationConnected({
      headers: request.headers,
      userId: oauthState.userId,
      organizationId: oauthState.organizationId,
      provider: INTEGRATION_PROVIDERS.SLACK,
      authKind: INTEGRATION_AUTH_KINDS.OAUTH,
    });

    return NextResponse.redirect(
      buildCallbackUrl(baseUrl, oauthState.callbackPath, {
        slackConnected: "true",
      })
    );
  } catch (error) {
    console.error("Error in Slack OAuth callback:", error);
    await restoreOAuthState?.();
    trackIntegrationConnectFailed({
      headers: request.headers,
      provider: INTEGRATION_PROVIDERS.SLACK,
      authKind: INTEGRATION_AUTH_KINDS.OAUTH,
      errorCode: "callback_failed",
    });
    return NextResponse.redirect(`${baseUrl}/?error=callback_failed`);
  }
}
