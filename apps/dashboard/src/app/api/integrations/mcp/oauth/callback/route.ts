import { MCP_OAUTH_CALLBACK_PATH } from "@notra/ai/constants/mcp-auth";
import {
  cancelMcpOAuthAuthorization,
  completeMcpOAuthAuthorization,
  getMcpOAuthCallbackPath,
} from "@notra/ai/integrations/mcp-oauth";
import {
  McpOAuthAuthorizationError,
  McpOAuthRefreshTokenRequiredError,
} from "@notra/ai/integrations/mcp-oauth-errors";
import { refreshMcpToolIndexForIntegration } from "@notra/ai/integrations/mcp-tool-index";
import { mcpOAuthCallbackQuerySchema } from "@notra/schemas/dashboard/integrations";
import { buildCallbackUrl } from "@notra/utils/callback-url";
import { createMcpOAuthPopupCompletionResponse } from "@notra/utils/oauth-popup";
import { Effect } from "effect";
import type { NextRequest } from "next/server";

import {
  INTEGRATION_AUTH_KINDS,
  INTEGRATION_PROVIDERS,
} from "@/constants/integration-analytics";
import { getServerSession } from "@/lib/auth/session";
import {
  trackIntegrationConnected,
  trackIntegrationConnectFailed,
} from "@/lib/integrations/connect-events";

export async function GET(request: NextRequest) {
  const baseUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    new URL(request.url).origin;
  const { searchParams } = new URL(request.url);
  const parsed = mcpOAuthCallbackQuerySchema.safeParse({
    code: searchParams.get("code") ?? undefined,
    error: searchParams.get("error") ?? undefined,
    state: searchParams.get("state") ?? undefined,
  });

  if (!parsed.success) {
    return createMcpOAuthPopupCompletionResponse(
      `${baseUrl}/?error=mcp_oauth_invalid_callback`
    );
  }

  const { session } = await getServerSession({ headers: request.headers });
  if (!session?.userId) {
    return createMcpOAuthPopupCompletionResponse(
      `${baseUrl}/?error=mcp_oauth_session_required`
    );
  }

  const callbackPath = await getMcpOAuthCallbackPath(
    parsed.data.state,
    session.userId
  );

  if (parsed.data.error || !parsed.data.code) {
    await cancelMcpOAuthAuthorization(parsed.data.state, session.userId);
    trackIntegrationConnectFailed({
      headers: request.headers,
      userId: session.userId,
      provider: INTEGRATION_PROVIDERS.MCP,
      authKind: INTEGRATION_AUTH_KINDS.OAUTH,
      errorCode: "mcp_oauth_denied",
    });
    return createMcpOAuthPopupCompletionResponse(
      buildCallbackUrl(baseUrl, callbackPath, {
        error: "mcp_oauth_denied",
      })
    );
  }

  try {
    const completed = await Effect.runPromise(
      completeMcpOAuthAuthorization({
        callbackState: parsed.data.state,
        code: parsed.data.code,
        redirectUrl: `${baseUrl}${MCP_OAUTH_CALLBACK_PATH}`,
        userId: session.userId,
      })
    );
    await refreshMcpToolIndexForIntegration({
      organizationId: completed.organizationId,
      integrationId: completed.integrationId,
    }).catch(() => undefined);
    trackIntegrationConnected({
      headers: request.headers,
      userId: session.userId,
      organizationId: completed.organizationId,
      provider: INTEGRATION_PROVIDERS.MCP,
      authKind: INTEGRATION_AUTH_KINDS.OAUTH,
    });
    return createMcpOAuthPopupCompletionResponse(
      buildCallbackUrl(baseUrl, callbackPath, {
        mcpConnected: "true",
      })
    );
  } catch (error) {
    console.error("MCP OAuth callback failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    let errorCode = "mcp_oauth_failed";
    if (error instanceof McpOAuthRefreshTokenRequiredError) {
      errorCode = "mcp_oauth_refresh_token_required";
    } else if (error instanceof McpOAuthAuthorizationError) {
      errorCode = "mcp_oauth_invalid_callback";
    }
    trackIntegrationConnectFailed({
      headers: request.headers,
      userId: session.userId,
      provider: INTEGRATION_PROVIDERS.MCP,
      authKind: INTEGRATION_AUTH_KINDS.OAUTH,
      errorCode,
    });
    return createMcpOAuthPopupCompletionResponse(
      buildCallbackUrl(baseUrl, callbackPath, { error: errorCode })
    );
  }
}
