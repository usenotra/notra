import { redis } from "@notra/ai/utils/redis";
import { slackAuthorizeQuerySchema } from "@notra/schemas/dashboard/slack-integration";
import { ORPCError } from "@orpc/server";
import { type NextRequest, NextResponse } from "next/server";

import {
  SLACK_BOT_SCOPES,
  SLACK_OAUTH_STATE_TTL_SECONDS,
} from "@/constants/slack-integration";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { slackOAuthErrorParam } from "@/lib/integrations/slack/oauth-errors";
import { ratelimit } from "@/utils/ratelimit";

// react-doctor-disable-next-line nextjs-no-side-effect-in-get-handler
export async function GET(request: NextRequest) {
  const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  try {
    const { searchParams } = new URL(request.url);
    const parsed = slackAuthorizeQuerySchema.safeParse({
      organizationId: searchParams.get("organizationId") ?? undefined,
      callbackPath: searchParams.get("callbackPath") ?? undefined,
    });

    if (!parsed.success) {
      const missingOrganization = parsed.error.issues.some(
        (issue) => issue.path[0] === "organizationId"
      );
      const errorParam = missingOrganization
        ? "missing_organization"
        : "invalid_request";
      return NextResponse.redirect(`${baseUrl}/?error=${errorParam}`);
    }

    const { organizationId, callbackPath } = parsed.data;

    let userId: string;
    try {
      const access = await assertOrganizationAccess({
        headers: request.headers,
        organizationId,
      });
      userId = access.user.id;
    } catch (error) {
      if (error instanceof ORPCError) {
        return NextResponse.redirect(
          `${baseUrl}/?error=${slackOAuthErrorParam(error.status)}`
        );
      }
      throw error;
    }

    const { success: withinLimit } = await ratelimit.slackOAuth.limit(userId);
    if (!withinLimit) {
      return NextResponse.redirect(
        `${baseUrl}${callbackPath}?error=rate_limited`
      );
    }

    const clientId = process.env.SLACK_AGENT_CLIENT_ID;
    if (!clientId || !redis) {
      return NextResponse.redirect(
        `${baseUrl}${callbackPath}?error=slack_not_configured`
      );
    }

    const state = crypto.randomUUID();
    const redirectBaseUrl =
      process.env.SLACK_OAUTH_REDIRECT_BASE_URL?.trim() || baseUrl;
    const redirectUri = `${redirectBaseUrl}/api/integrations/slack/callback`;

    await redis.set(
      `slack_oauth:${state}`,
      JSON.stringify({
        organizationId,
        userId,
        callbackPath,
      }),
      { ex: SLACK_OAUTH_STATE_TTL_SECONDS }
    );

    const authUrl = new URL("https://slack.com/oauth/v2/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", SLACK_BOT_SCOPES);
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Error initiating Slack OAuth:", error);
    return NextResponse.redirect(`${baseUrl}/?error=slack_auth_failed`);
  }
}
