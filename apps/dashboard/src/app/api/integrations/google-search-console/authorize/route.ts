import {
  GSC_OAUTH_AUTHORIZE_URL,
  GSC_OAUTH_SCOPES,
} from "@notra/ai/constants/google-search-console";
import { getGscOAuthCredentials } from "@notra/ai/integrations/google-search-console";
import { redis } from "@notra/ai/utils/redis";
import {
  GSC_OAUTH_STATE_KEY_PREFIX,
  GSC_OAUTH_STATE_TTL_SECONDS,
} from "@notra/geo-core/constants/google-search-console";
import { gscAuthorizeQuerySchema } from "@notra/geo-core/schemas/google-search-console";
import type { GscOAuthState } from "@notra/geo-core/types/google-search-console";
import { buildCallbackUrl } from "@notra/utils/callback-url";
import { ORPCError } from "@orpc/server";
import { type NextRequest, NextResponse } from "next/server";

import { assertOrganizationAccess } from "@/lib/auth/organization";
import { gscOAuthErrorParam } from "@/lib/integrations/google-search-console/oauth-errors";
import { getGscRedirectUri } from "@/lib/integrations/google-search-console/redirect-uri";
import { ratelimit } from "@/utils/ratelimit";

// OAuth authorize endpoints are GET by spec; the only side effect is storing
// a random, short-lived CSRF state nonce in Redis.
// react-doctor-disable-next-line nextjs-no-side-effect-in-get-handler
export async function GET(request: NextRequest) {
  const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  try {
    const { searchParams } = new URL(request.url);
    const parsed = gscAuthorizeQuerySchema.safeParse({
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
          buildCallbackUrl(baseUrl, callbackPath, {
            error: gscOAuthErrorParam(error.status),
          })
        );
      }
      throw error;
    }

    const { success: withinLimit } = await ratelimit.gscOAuth.limit(userId);
    if (!withinLimit) {
      return NextResponse.redirect(
        buildCallbackUrl(baseUrl, callbackPath, { error: "gsc_rate_limited" })
      );
    }

    const credentials = getGscOAuthCredentials();
    if (!(credentials && redis)) {
      return NextResponse.redirect(
        buildCallbackUrl(baseUrl, callbackPath, { error: "gsc_not_configured" })
      );
    }

    const state = crypto.randomUUID();
    const oauthState: GscOAuthState = { organizationId, userId, callbackPath };
    await redis.set(
      `${GSC_OAUTH_STATE_KEY_PREFIX}${state}`,
      JSON.stringify(oauthState),
      { ex: GSC_OAUTH_STATE_TTL_SECONDS }
    );

    const authUrl = new URL(GSC_OAUTH_AUTHORIZE_URL);
    authUrl.searchParams.set("client_id", credentials.clientId);
    authUrl.searchParams.set("redirect_uri", getGscRedirectUri(baseUrl));
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", GSC_OAUTH_SCOPES.join(" "));
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Error initiating Google Search Console OAuth:", error);
    return NextResponse.redirect(`${baseUrl}/?error=gsc_auth_failed`);
  }
}
