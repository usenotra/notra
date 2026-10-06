import { MCP_OAUTH_CALLBACK_PATH } from "@notra/ai/constants/mcp-auth";
import { useLogger as getRequestLogger, withEvlog } from "@notra/ai/evlog";
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

import {
  INTEGRATION_AUTH_KINDS,
  INTEGRATION_PROVIDERS,
} from "@/constants/integration-analytics";
import { getServerSession } from "@/lib/auth/session";
import {
  trackIntegrationConnected,
  trackIntegrationConnectFailed,
} from "@/lib/integrations/connect-events";

export const GET = withEvlog(async (request: Request) => {
  const log = getRequestLogger();
  log.set({
    feature: "mcp_oauth_callback",
    routeId: "/api/integrations/mcp/oauth/callback",
  });
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
    log.set({ outcome: "error", errorCode: "mcp_oauth_invalid_callback" });
    return createMcpOAuthPopupCompletionResponse(
      `${baseUrl}/?error=mcp_oauth_invalid_callback`
    );
  }

  const { session } = await getServerSession({ headers: request.headers });
  if (!session?.userId) {
    log.set({ outcome: "error", errorCode: "mcp_oauth_session_required" });
    return createMcpOAuthPopupCompletionResponse(
      `${baseUrl}/?error=mcp_oauth_session_required`
    );
  }

  log.set({ userId: session.userId });

  const callbackPath = await getMcpOAuthCallbackPath(
    parsed.data.state,
    session.userId
  );

  if (parsed.data.error || !parsed.data.code) {
    await cancelMcpOAuthAuthorization(parsed.data.state, session.userId);
    log.set({
      outcome: "denied",
      errorCode: "mcp_oauth_denied",
      providerError: parsed.data.error,
    });
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
    log.set({
      organizationId: completed.organizationId,
      integrationId: completed.integrationId,
    });
    await refreshMcpToolIndexForIntegration({
      organizationId: completed.organizationId,
      integrationId: completed.integrationId,
    }).catch((error: unknown) => {
      log.set({
        toolIndexRefreshFailed: true,
        toolIndexRefreshError:
          error instanceof Error ? error.message : String(error),
      });
    });
    log.set({ outcome: "success" });
    log.audit({
      action: "integration.mcp.connected",
      actor: { type: "user", id: session.userId },
      target: { type: "integration", id: completed.integrationId },
      outcome: "success",
    });
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
    let errorCode = "mcp_oauth_failed";
    if (error instanceof McpOAuthRefreshTokenRequiredError) {
      errorCode = "mcp_oauth_refresh_token_required";
    } else if (error instanceof McpOAuthAuthorizationError) {
      errorCode = "mcp_oauth_invalid_callback";
    }
    log.error(error instanceof Error ? error : String(error), {
      outcome: "error",
      errorCode,
    });
    log.audit({
      action: "integration.mcp.connected",
      actor: { type: "user", id: session.userId },
      outcome: "failure",
      reason: errorCode,
    });
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
});
