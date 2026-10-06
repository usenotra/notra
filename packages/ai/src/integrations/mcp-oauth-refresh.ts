import { refreshAuthorization } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import { logError } from "@notra/ai/utils/server-log";
import { db } from "@notra/db/drizzle";
import { mcpOAuthCredentials, mcpServerIntegrations } from "@notra/db/schema";
import { and, eq, isNull, lt, ne, or, sql } from "drizzle-orm";

import {
  MCP_OAUTH_REFRESH_HEARTBEAT_MS,
  MCP_OAUTH_REFRESH_LEASE_MS,
  MCP_OAUTH_REFRESH_RETRY_DELAY_MS,
  MCP_OAUTH_REFRESH_WAIT_MS,
  MCP_OAUTH_REFRESH_WAIT_TIMEOUT_MS,
  TERMINAL_OAUTH_ERROR_CODES,
} from "../constants/mcp-auth";
import {
  mcpOAuthClientInformationSchema,
  mcpOAuthStoredAuthorizationServerSchema,
  mcpOAuthTokensSchema,
} from "../schemas/mcp-oauth";
import type {
  McpRequestAuth,
  RefreshMcpOAuthRequestAuthParams,
} from "../types/mcp-oauth";
import { publicMcpOAuthFetch } from "../utils/mcp-oauth-fetch";
import {
  decryptMcpOAuthSecret,
  encryptMcpOAuthSecret,
} from "../utils/mcp-oauth-secrets";
import {
  getMcpAccessTokenExpiresAt,
  getMcpAccessTokenRefreshAt,
  isMcpAccessTokenExpiring,
  toMcpOAuthRequestAuth,
} from "../utils/mcp-oauth-tokens";
import { restoreMcpOAuthServerConfiguration } from "./mcp-oauth-discovery";
import {
  McpOAuthAuthorizationError,
  McpOAuthReauthorizationRequiredError,
  McpOAuthRefreshTokenRequiredError,
} from "./mcp-oauth-errors";

function getOAuthErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "errorCode" in error &&
    typeof error.errorCode === "string"
  ) {
    return error.errorCode;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return undefined;
}

function isTerminalOAuthError(error: unknown) {
  const errorCode = getOAuthErrorCode(error);
  return (
    error instanceof McpOAuthReauthorizationRequiredError ||
    error instanceof McpOAuthRefreshTokenRequiredError ||
    (errorCode !== undefined && TERMINAL_OAUTH_ERROR_CODES.has(errorCode))
  );
}

export async function getStoredMcpOAuthCredential(
  organizationId: string,
  integrationId: string
) {
  const [row] = await db
    .select({
      credential: mcpOAuthCredentials,
      serverUrl: mcpServerIntegrations.url,
    })
    .from(mcpOAuthCredentials)
    .innerJoin(
      mcpServerIntegrations,
      eq(mcpOAuthCredentials.serverIntegrationId, mcpServerIntegrations.id)
    )
    .where(
      and(
        eq(mcpOAuthCredentials.organizationId, organizationId),
        eq(mcpOAuthCredentials.serverIntegrationId, integrationId)
      )
    )
    .limit(1);
  return row;
}

export async function getMcpOAuthRequestAuth(
  organizationId: string,
  integrationId: string
): Promise<McpRequestAuth> {
  const stored = await getStoredMcpOAuthCredential(
    organizationId,
    integrationId
  );
  if (!stored || stored.credential.status === "reauth_required") {
    throw new McpOAuthReauthorizationRequiredError();
  }
  if (isMcpAccessTokenExpiring(stored.credential.accessTokenRefreshAt)) {
    if (
      stored.credential.lastError &&
      Date.now() - stored.credential.updatedAt.getTime() <
        MCP_OAUTH_REFRESH_RETRY_DELAY_MS
    ) {
      throw new McpOAuthAuthorizationError(
        "OAuth token refresh is temporarily unavailable."
      );
    }
    return refreshMcpOAuthRequestAuth({
      organizationId,
      integrationId,
      expectedTokenVersion: stored.credential.tokenVersion,
    });
  }
  const tokens = decryptMcpOAuthSecret(
    stored.credential.encryptedTokens,
    mcpOAuthTokensSchema
  );
  if (!tokens) {
    throw new McpOAuthReauthorizationRequiredError();
  }
  return toMcpOAuthRequestAuth(tokens, stored.credential.tokenVersion);
}

export async function refreshMcpOAuthRequestAuth({
  organizationId,
  integrationId,
  expectedTokenVersion,
}: RefreshMcpOAuthRequestAuthParams): Promise<McpRequestAuth> {
  let refreshLeaseId: string | undefined;
  try {
    const stored = await getStoredMcpOAuthCredential(
      organizationId,
      integrationId
    );
    if (!stored || stored.credential.status === "reauth_required") {
      throw new McpOAuthReauthorizationRequiredError();
    }
    const currentTokens = decryptMcpOAuthSecret(
      stored.credential.encryptedTokens,
      mcpOAuthTokensSchema
    );
    if (!currentTokens?.refresh_token) {
      throw new McpOAuthRefreshTokenRequiredError();
    }
    const refreshIsCurrent =
      stored.credential.status === "refreshing" &&
      stored.credential.refreshLeaseExpiresAt !== null &&
      stored.credential.refreshLeaseExpiresAt.getTime() > Date.now();
    if (refreshIsCurrent) {
      return waitForMcpOAuthRefresh(organizationId, integrationId);
    }
    if (
      stored.credential.status !== "refreshing" &&
      expectedTokenVersion !== undefined &&
      stored.credential.tokenVersion !== expectedTokenVersion
    ) {
      return toMcpOAuthRequestAuth(
        currentTokens,
        stored.credential.tokenVersion
      );
    }
    const leaseId = crypto.randomUUID();
    const leaseClaimedAt = new Date();
    const [claim] = await db
      .update(mcpOAuthCredentials)
      .set({
        status: "refreshing",
        refreshLeaseId: leaseId,
        refreshLeaseExpiresAt: new Date(
          leaseClaimedAt.getTime() + MCP_OAUTH_REFRESH_LEASE_MS
        ),
        updatedAt: leaseClaimedAt,
      })
      .where(
        and(
          eq(mcpOAuthCredentials.organizationId, organizationId),
          eq(mcpOAuthCredentials.serverIntegrationId, integrationId),
          eq(mcpOAuthCredentials.tokenVersion, stored.credential.tokenVersion),
          ne(mcpOAuthCredentials.status, "reauth_required"),
          or(
            ne(mcpOAuthCredentials.status, "refreshing"),
            isNull(mcpOAuthCredentials.refreshLeaseExpiresAt),
            lt(mcpOAuthCredentials.refreshLeaseExpiresAt, leaseClaimedAt)
          )
        )
      )
      .returning({ refreshLeaseId: mcpOAuthCredentials.refreshLeaseId });
    if (!claim) {
      return waitForMcpOAuthRefresh(organizationId, integrationId);
    }
    refreshLeaseId = leaseId;
    return await refreshClaimedMcpOAuthCredential(
      currentTokens,
      integrationId,
      leaseId,
      organizationId,
      stored
    );
  } catch (error) {
    if (isTerminalOAuthError(error)) {
      await markMcpOAuthReauthorizationRequired(
        organizationId,
        integrationId,
        refreshLeaseId
      );
      throw new McpOAuthReauthorizationRequiredError();
    }
    if (refreshLeaseId !== undefined) {
      await releaseMcpOAuthRefreshClaim(
        organizationId,
        integrationId,
        refreshLeaseId,
        error
      );
    }
    throw error;
  }
}

async function refreshClaimedMcpOAuthCredential(
  currentTokens: OAuthTokens,
  integrationId: string,
  refreshLeaseId: string,
  organizationId: string,
  stored: NonNullable<Awaited<ReturnType<typeof getStoredMcpOAuthCredential>>>
) {
  const stopHeartbeat = startMcpOAuthRefreshHeartbeat(
    organizationId,
    integrationId,
    refreshLeaseId
  );
  try {
    return await refreshClaimedMcpOAuthCredentialWithHeartbeat(
      currentTokens,
      integrationId,
      refreshLeaseId,
      organizationId,
      stored
    );
  } finally {
    stopHeartbeat();
  }
}

async function refreshClaimedMcpOAuthCredentialWithHeartbeat(
  currentTokens: OAuthTokens,
  integrationId: string,
  refreshLeaseId: string,
  organizationId: string,
  stored: NonNullable<Awaited<ReturnType<typeof getStoredMcpOAuthCredential>>>
) {
  const storedRefreshToken = currentTokens.refresh_token;
  if (!storedRefreshToken) {
    throw new McpOAuthRefreshTokenRequiredError();
  }
  const storedAuthorizationServer = decryptMcpOAuthSecret(
    stored.credential.encryptedAuthorizationServerInformation,
    mcpOAuthStoredAuthorizationServerSchema
  );
  const clientInformation = decryptMcpOAuthSecret(
    stored.credential.encryptedClientInformation,
    mcpOAuthClientInformationSchema
  );
  if (!(storedAuthorizationServer && clientInformation)) {
    throw new McpOAuthReauthorizationRequiredError();
  }
  const configuration = await restoreMcpOAuthServerConfiguration(
    stored.serverUrl,
    storedAuthorizationServer
  );
  const nextTokens = await refreshAuthorization(
    configuration.authorizationServerUrl,
    {
      metadata: configuration.authorizationServerMetadata,
      clientInformation,
      refreshToken: storedRefreshToken,
      resource: configuration.resource,
      fetchFn: publicMcpOAuthFetch,
    }
  );
  const refreshedTokens = nextTokens.refresh_token
    ? nextTokens
    : { ...nextTokens, refresh_token: storedRefreshToken };
  const [persisted] = await db
    .update(mcpOAuthCredentials)
    .set({
      encryptedTokens: encryptMcpOAuthSecret(refreshedTokens),
      encryptedAuthorizationServerInformation: encryptMcpOAuthSecret(
        configuration.authorizationServerMetadata
      ),
      encryptedClientInformation: encryptMcpOAuthSecret(clientInformation),
      accessTokenExpiresAt: getMcpAccessTokenExpiresAt(refreshedTokens),
      accessTokenRefreshAt: getMcpAccessTokenRefreshAt(refreshedTokens),
      status: "connected",
      tokenVersion: sql`${mcpOAuthCredentials.tokenVersion} + 1`,
      refreshLeaseId: null,
      refreshLeaseExpiresAt: null,
      lastRefreshedAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mcpOAuthCredentials.organizationId, organizationId),
        eq(mcpOAuthCredentials.serverIntegrationId, integrationId),
        eq(mcpOAuthCredentials.refreshLeaseId, refreshLeaseId),
        eq(mcpOAuthCredentials.status, "refreshing")
      )
    )
    .returning({ tokenVersion: mcpOAuthCredentials.tokenVersion });
  if (!persisted) {
    return waitForMcpOAuthRefresh(organizationId, integrationId);
  }
  return toMcpOAuthRequestAuth(refreshedTokens, persisted.tokenVersion);
}

function startMcpOAuthRefreshHeartbeat(
  organizationId: string,
  integrationId: string,
  refreshLeaseId: string
) {
  const interval = setInterval(() => {
    const now = new Date();
    return db
      .update(mcpOAuthCredentials)
      .set({
        refreshLeaseExpiresAt: new Date(
          now.getTime() + MCP_OAUTH_REFRESH_LEASE_MS
        ),
        updatedAt: now,
      })
      .where(
        and(
          eq(mcpOAuthCredentials.organizationId, organizationId),
          eq(mcpOAuthCredentials.serverIntegrationId, integrationId),
          eq(mcpOAuthCredentials.refreshLeaseId, refreshLeaseId),
          eq(mcpOAuthCredentials.status, "refreshing")
        )
      )
      .catch((error) => {
        logError("[MCP OAuth Refresh] Heartbeat failed", undefined, {
          integrationId,
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }, MCP_OAUTH_REFRESH_HEARTBEAT_MS);
  return () => clearInterval(interval);
}

async function waitForMcpOAuthRefresh(
  organizationId: string,
  integrationId: string
): Promise<McpRequestAuth> {
  const deadline = Date.now() + MCP_OAUTH_REFRESH_WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) =>
      setTimeout(resolve, MCP_OAUTH_REFRESH_WAIT_MS)
    );
    const stored = await getStoredMcpOAuthCredential(
      organizationId,
      integrationId
    );
    if (!stored || stored.credential.status === "reauth_required") {
      throw new McpOAuthReauthorizationRequiredError();
    }
    if (stored.credential.status !== "refreshing") {
      if (isMcpAccessTokenExpiring(stored.credential.accessTokenRefreshAt)) {
        throw new McpOAuthAuthorizationError(
          "OAuth token refresh did not complete."
        );
      }
      const tokens = decryptMcpOAuthSecret(
        stored.credential.encryptedTokens,
        mcpOAuthTokensSchema
      );
      if (!tokens) {
        throw new McpOAuthReauthorizationRequiredError();
      }
      return toMcpOAuthRequestAuth(tokens, stored.credential.tokenVersion);
    }
    if (
      stored.credential.refreshLeaseExpiresAt === null ||
      stored.credential.refreshLeaseExpiresAt.getTime() <= Date.now()
    ) {
      return refreshMcpOAuthRequestAuth({
        organizationId,
        integrationId,
        expectedTokenVersion: stored.credential.tokenVersion,
      });
    }
  }
  throw new McpOAuthAuthorizationError("OAuth token refresh timed out.");
}

async function markMcpOAuthReauthorizationRequired(
  organizationId: string,
  integrationId: string,
  refreshLeaseId?: string
) {
  await db
    .update(mcpOAuthCredentials)
    .set({
      status: "reauth_required",
      refreshLeaseId: null,
      refreshLeaseExpiresAt: null,
      lastError: "OAuth authorization must be renewed.",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mcpOAuthCredentials.organizationId, organizationId),
        eq(mcpOAuthCredentials.serverIntegrationId, integrationId),
        ...(refreshLeaseId === undefined
          ? []
          : [eq(mcpOAuthCredentials.refreshLeaseId, refreshLeaseId)])
      )
    );
}

async function releaseMcpOAuthRefreshClaim(
  organizationId: string,
  integrationId: string,
  refreshLeaseId: string,
  error: unknown
) {
  await db
    .update(mcpOAuthCredentials)
    .set({
      status: "connected",
      refreshLeaseId: null,
      refreshLeaseExpiresAt: null,
      lastError: "OAuth refresh failed.",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mcpOAuthCredentials.organizationId, organizationId),
        eq(mcpOAuthCredentials.serverIntegrationId, integrationId),
        eq(mcpOAuthCredentials.refreshLeaseId, refreshLeaseId),
        eq(mcpOAuthCredentials.status, "refreshing")
      )
    );

  logError("[MCP OAuth Refresh] Refresh failed", undefined, {
    integrationId,
    organizationId,
    error: error instanceof Error ? error.message : String(error),
  });
}
