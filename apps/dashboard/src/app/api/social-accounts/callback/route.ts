import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { socialConnectCallbackQuerySchema } from "@notra/schemas/dashboard/social-accounts";
import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";

import {
  INTEGRATION_AUTH_KINDS,
  SOCIAL_PLATFORM_TO_INTEGRATION_PROVIDER,
} from "@/constants/integration-analytics";
import { SOCIAL_CONNECTED_PARAMS } from "@/constants/social-connect";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { getServerSession } from "@/lib/auth/session";
import {
  trackIntegrationConnected,
  trackIntegrationConnectFailed,
} from "@/lib/integrations/connect-events";
import { fromProviderPlatform } from "@/lib/social-connect/client";
import { completeSocialConnect } from "@/lib/social-connect/connect";

function readAccountIds(searchParams: URLSearchParams): string[] {
  const accountIds: string[] = [];
  for (const value of searchParams.getAll("accountIds")) {
    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (trimmed) {
        accountIds.push(trimmed);
      }
    }
  }
  return accountIds;
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const { searchParams } = new URL(request.url);
  const parsed = socialConnectCallbackQuerySchema.safeParse({
    provider: searchParams.get("provider") ?? undefined,
    isSuccess: searchParams.get("isSuccess") ?? undefined,
    accountIds: readAccountIds(searchParams),
    error: searchParams.get("error") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.redirect(`${baseUrl}/?error=invalid_callback`);
  }

  const failed =
    parsed.data.error ||
    parsed.data.isSuccess === "false" ||
    parsed.data.accountIds.length === 0;

  const requestedPlatform = parsed.data.provider
    ? fromProviderPlatform(parsed.data.provider)
    : null;

  if (failed) {
    if (requestedPlatform) {
      trackIntegrationConnectFailed({
        headers: request.headers,
        provider: SOCIAL_PLATFORM_TO_INTEGRATION_PROVIDER[requestedPlatform],
        authKind: INTEGRATION_AUTH_KINDS.OAUTH,
        errorCode: parsed.data.error || "connection_failed",
      });
    }
    return NextResponse.redirect(`${baseUrl}/?error=connection_failed`);
  }

  const { user } = await getServerSession({ headers: request.headers });

  try {
    const result = await Effect.runPromise(
      completeSocialConnect({
        accountIds: parsed.data.accountIds,
        platform: requestedPlatform,
        userId: user?.id ?? null,
      }).pipe(
        Effect.map((value) => ({ status: "connected" as const, ...value })),
        Effect.catch((error) =>
          Effect.succeed({ status: "failed" as const, code: error.code })
        )
      )
    );

    if (result.status === "failed") {
      if (requestedPlatform) {
        trackIntegrationConnectFailed({
          headers: request.headers,
          userId: user?.id ?? null,
          provider: SOCIAL_PLATFORM_TO_INTEGRATION_PROVIDER[requestedPlatform],
          authKind: INTEGRATION_AUTH_KINDS.OAUTH,
          errorCode: result.code,
        });
      }
      return NextResponse.redirect(
        `${baseUrl}/?error=${encodeURIComponent(result.code)}`
      );
    }

    if (result.selectionToken) {
      const selectionUrl = new URL("/connect/linkedin", baseUrl);
      selectionUrl.searchParams.set("token", result.selectionToken);
      return NextResponse.redirect(selectionUrl.toString());
    }

    trackIntegrationConnected({
      headers: request.headers,
      userId: user?.id ?? null,
      provider: SOCIAL_PLATFORM_TO_INTEGRATION_PROVIDER[result.platform],
      authKind: INTEGRATION_AUTH_KINDS.OAUTH,
    });
    trackServerEvent({
      event: POSTHOG_EVENTS.SOCIAL_ACCOUNT_CONNECTED,
      headers: request.headers,
      userId: user?.id ?? null,
      properties: {
        platform: result.platform,
        account_count: parsed.data.accountIds.length,
      },
    });

    const rawPath = result.callbackPath || "/";
    const callbackPath =
      rawPath.startsWith("/") && !rawPath.startsWith("//") ? rawPath : "/";
    const separator = callbackPath.includes("?") ? "&" : "?";
    const connectedParam = SOCIAL_CONNECTED_PARAMS[result.platform];

    return NextResponse.redirect(
      `${baseUrl}${callbackPath}${separator}${connectedParam}=true`
    );
  } catch (error) {
    console.error("Error in social connect callback:", error);
    if (requestedPlatform) {
      trackIntegrationConnectFailed({
        headers: request.headers,
        userId: user?.id ?? null,
        provider: SOCIAL_PLATFORM_TO_INTEGRATION_PROVIDER[requestedPlatform],
        authKind: INTEGRATION_AUTH_KINDS.OAUTH,
        errorCode: "callback_failed",
      });
    }
    return NextResponse.redirect(`${baseUrl}/?error=callback_failed`);
  }
}
