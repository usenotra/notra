import { redis } from "@notra/ai/utils/redis";
import { linearAuthorizeQuerySchema } from "@notra/schemas/dashboard/linear";
import { ORPCError } from "@orpc/server";
import { type NextRequest, NextResponse } from "next/server";

import { LINEAR_OAUTH_STATE_TTL_SECONDS } from "@/constants/linear";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { linearOAuthErrorParam } from "@/lib/integrations/linear/oauth-errors";

// react-doctor-disable-next-line nextjs-no-side-effect-in-get-handler
export async function GET(request: NextRequest) {
  const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  try {
    const { searchParams } = new URL(request.url);
    const parsed = linearAuthorizeQuerySchema.safeParse({
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
          `${baseUrl}/?error=${linearOAuthErrorParam(error.status)}`
        );
      }
      throw error;
    }

    const clientId = process.env.LINEAR_CLIENT_ID;
    if (!clientId || !redis) {
      return NextResponse.redirect(`${baseUrl}/?error=linear_not_configured`);
    }

    const state = crypto.randomUUID();
    const redirectUri = `${baseUrl}/api/integrations/linear/callback`;

    await redis.set(
      `linear_oauth:${state}`,
      JSON.stringify({
        organizationId,
        userId,
        callbackPath,
      }),
      { ex: LINEAR_OAUTH_STATE_TTL_SECONDS }
    );

    const authUrl = new URL("https://linear.app/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "read");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "consent");

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Error initiating Linear OAuth:", error);
    return NextResponse.redirect(`${baseUrl}/?error=linear_auth_failed`);
  }
}
