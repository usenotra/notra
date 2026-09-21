import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { db } from "@notra/db/drizzle";
import { mcpOAuthCredentials, mcpServerIntegrations } from "@notra/db/schema";
import { assertPublicHttpUrlResolution } from "@notra/utils/url";
import { and, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";

import type {
  CreateMcpServerIntegrationParams,
  McpHeaderMap,
  McpIntegrationResourceType,
  McpServerIntegrationScope,
  McpServerIntegrationSerializationInput,
  McpStoreStatus,
  McpTypedServerIntegrationScope,
  UpdateMcpServerIntegrationParams,
} from "../types/integrations";
import type { McpAuthType } from "../types/mcp-oauth";
import { publicMcpRuntimeFetch } from "../utils/mcp-fetch";
import { encryptMcpHeaders } from "../utils/mcp-headers";
import { hasOrganizationAccess } from "../utils/organization-access";
import { McpStoreListingUnavailableError } from "./mcp-store-errors";
import { refreshMcpToolIndexForIntegration } from "./mcp-tool-index";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);
type McpPreviewTool = Awaited<ReturnType<Client["listTools"]>>["tools"][number];

function getMcpAuthType(authType: string): McpAuthType {
  if (authType === "headers" || authType === "oauth") {
    return authType;
  }
  return "none";
}

function getMcpStoreStatus(storeStatus: string | undefined): McpStoreStatus {
  if (
    storeStatus === "pending_review" ||
    storeStatus === "live" ||
    storeStatus === "rejected"
  ) {
    return storeStatus;
  }
  return "draft";
}

function getMcpResourceType(
  resourceType: string | undefined
): McpIntegrationResourceType {
  return resourceType === "store_listing" ? "store_listing" : "connection";
}

function getMcpOAuthStatus(status: string | undefined) {
  if (status === "connected" || status === "refreshing") {
    return "connected" as const;
  }
  return status === "reauth_required"
    ? ("reauth_required" as const)
    : ("error" as const);
}

async function assertOrganizationMember(
  organizationId: string,
  userId: string
) {
  if (!(await hasOrganizationAccess(userId, organizationId))) {
    throw new Error("User does not have access to this organization.");
  }
}

export function serializeMcpServerIntegration(
  integration: McpServerIntegrationSerializationInput
) {
  return {
    id: integration.id,
    name: integration.name,
    url: integration.url,
    description: integration.description,
    resourceType: getMcpResourceType(integration.resourceType),
    author: integration.author ?? null,
    websiteUrl: integration.websiteUrl ?? null,
    brandColor: integration.brandColor ?? null,
    logoLightUrl: integration.logoLightUrl ?? null,
    logoDarkUrl: integration.logoDarkUrl ?? null,
    bannerUrl: integration.bannerUrl ?? null,
    slug: integration.slug ?? null,
    storeSourceIntegrationId: integration.storeSourceIntegrationId ?? null,
    storeStatus: getMcpStoreStatus(integration.storeStatus),
    reviewNote: integration.reviewNote ?? null,
    submittedAt: integration.submittedAt?.toISOString() ?? null,
    reviewedAt: integration.reviewedAt?.toISOString() ?? null,
    authType: getMcpAuthType(integration.authType),
    oauthStatus:
      integration.authType === "oauth"
        ? getMcpOAuthStatus(integration.oauthCredential?.status)
        : null,
    enabled: integration.enabled,
    headerNames: Object.keys(integration.encryptedHeaders ?? {}),
    hasHeaders: Object.keys(integration.encryptedHeaders ?? {}).length > 0,
    lastToolSyncAt: integration.lastToolSyncAt?.toISOString() ?? null,
    toolSyncStatus: integration.toolSyncStatus ?? "idle",
    toolSyncError: integration.toolSyncError ?? null,
    indexedToolCount: integration.indexedToolCount ?? 0,
    createdAt: integration.createdAt.toISOString(),
    updatedAt: integration.updatedAt?.toISOString() ?? null,
    ...(integration.createdByUser
      ? { createdByUser: integration.createdByUser }
      : {}),
  };
}

async function createMcpServerIntegration(
  params: CreateMcpServerIntegrationParams,
  resourceType: McpIntegrationResourceType
) {
  await assertOrganizationMember(params.organizationId, params.userId);
  await assertPublicHttpUrlResolution(params.url);

  if (resourceType === "connection" && params.storeSourceIntegrationId) {
    const storeSource = await db.query.mcpServerIntegrations.findFirst({
      columns: { id: true },
      where: and(
        eq(mcpServerIntegrations.id, params.storeSourceIntegrationId),
        eq(mcpServerIntegrations.resourceType, "store_listing"),
        eq(mcpServerIntegrations.storeStatus, "live"),
        eq(mcpServerIntegrations.enabled, true)
      ),
    });
    if (!storeSource) {
      throw new McpStoreListingUnavailableError();
    }
  }

  const [integration] = await db
    .insert(mcpServerIntegrations)
    .values({
      id: `mcp_${nanoid()}`,
      organizationId: params.organizationId,
      createdByUserId: params.userId,
      name: params.name,
      url: params.url,
      description: params.description ?? null,
      resourceType,
      author: params.author ?? null,
      websiteUrl: params.websiteUrl ?? null,
      brandColor: params.brandColor ?? null,
      logoLightUrl: params.logoLightUrl ?? null,
      logoDarkUrl: params.logoDarkUrl ?? null,
      bannerUrl: params.bannerUrl ?? null,
      slug: resourceType === "store_listing" ? (params.slug ?? null) : null,
      storeSourceIntegrationId:
        resourceType === "connection"
          ? (params.storeSourceIntegrationId ?? null)
          : null,
      authType: params.authType,
      encryptedHeaders:
        params.authType === "headers" ? encryptMcpHeaders(params.headers) : {},
    })
    .returning();

  if (!integration) {
    throw new Error("Failed to create MCP server integration.");
  }

  await refreshMcpToolIndexForIntegration({
    organizationId: params.organizationId,
    integrationId: integration.id,
  }).catch(() => undefined);

  return (
    (await getMcpServerIntegration({
      integrationId: integration.id,
      organizationId: params.organizationId,
      resourceType,
    })) ?? integration
  );
}

export function createMcpConnectionIntegration(
  params: CreateMcpServerIntegrationParams
) {
  return createMcpServerIntegration(params, "connection");
}

export function createMcpStoreListing(
  params: CreateMcpServerIntegrationParams
) {
  return createMcpServerIntegration(params, "store_listing");
}

async function getMcpServerIntegration(scope: McpTypedServerIntegrationScope) {
  const integration = await db.query.mcpServerIntegrations.findFirst({
    where: and(
      eq(mcpServerIntegrations.id, scope.integrationId),
      eq(mcpServerIntegrations.organizationId, scope.organizationId),
      eq(mcpServerIntegrations.resourceType, scope.resourceType)
    ),
    with: {
      createdByUser: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      oauthCredential: {
        columns: {
          status: true,
        },
      },
    },
  });

  return integration ?? null;
}

export function getMcpConnectionIntegration(scope: McpServerIntegrationScope) {
  return getMcpServerIntegration({ ...scope, resourceType: "connection" });
}

export function getMcpStoreListing(scope: McpServerIntegrationScope) {
  return getMcpServerIntegration({ ...scope, resourceType: "store_listing" });
}

export async function getMcpStoreListingById(integrationId: string) {
  const listing = await db.query.mcpServerIntegrations.findFirst({
    where: and(
      eq(mcpServerIntegrations.id, integrationId),
      eq(mcpServerIntegrations.resourceType, "store_listing")
    ),
    with: {
      createdByUser: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      oauthCredential: {
        columns: {
          status: true,
        },
      },
    },
  });
  return listing ?? null;
}

async function getMcpServerIntegrationsByOrganization(
  organizationId: string,
  resourceType: McpIntegrationResourceType
) {
  return db.query.mcpServerIntegrations.findMany({
    where: and(
      eq(mcpServerIntegrations.organizationId, organizationId),
      eq(mcpServerIntegrations.resourceType, resourceType)
    ),
    with: {
      createdByUser: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      oauthCredential: {
        columns: {
          status: true,
        },
      },
    },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
}

export function getMcpConnectionIntegrationsByOrganization(
  organizationId: string
) {
  return getMcpServerIntegrationsByOrganization(organizationId, "connection");
}

export function getMcpStoreListingsByOrganization(organizationId: string) {
  return getMcpServerIntegrationsByOrganization(
    organizationId,
    "store_listing"
  );
}

export async function hasEnabledMcpServerIntegrations(organizationId: string) {
  const integration = await db.query.mcpServerIntegrations.findFirst({
    columns: {
      id: true,
    },
    where: and(
      eq(mcpServerIntegrations.organizationId, organizationId),
      eq(mcpServerIntegrations.enabled, true),
      eq(mcpServerIntegrations.resourceType, "connection")
    ),
  });

  return Boolean(integration);
}

async function updateMcpServerIntegration(
  scope: McpServerIntegrationScope,
  resourceType: McpIntegrationResourceType,
  updates: UpdateMcpServerIntegrationParams
) {
  if (updates.url !== undefined) {
    await assertPublicHttpUrlResolution(updates.url);
  }

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(mcpServerIntegrations)
      .set({
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.url !== undefined ? { url: updates.url } : {}),
        ...(updates.description !== undefined
          ? { description: updates.description }
          : {}),
        ...(updates.author !== undefined ? { author: updates.author } : {}),
        ...(updates.websiteUrl !== undefined
          ? { websiteUrl: updates.websiteUrl }
          : {}),
        ...(updates.brandColor !== undefined
          ? { brandColor: updates.brandColor }
          : {}),
        ...(updates.logoLightUrl !== undefined
          ? { logoLightUrl: updates.logoLightUrl }
          : {}),
        ...(updates.logoDarkUrl !== undefined
          ? { logoDarkUrl: updates.logoDarkUrl }
          : {}),
        ...(updates.bannerUrl !== undefined
          ? { bannerUrl: updates.bannerUrl }
          : {}),
        ...(updates.slug !== undefined ? { slug: updates.slug } : {}),
        ...(updates.headers !== undefined
          ? { encryptedHeaders: encryptMcpHeaders(updates.headers) }
          : {}),
        ...(updates.authType !== undefined
          ? {
              authType: updates.authType,
              ...(updates.authType !== "headers"
                ? { encryptedHeaders: {} }
                : {}),
            }
          : {}),
        ...(updates.enabled !== undefined ? { enabled: updates.enabled } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(mcpServerIntegrations.id, scope.integrationId),
          eq(mcpServerIntegrations.organizationId, scope.organizationId),
          eq(mcpServerIntegrations.resourceType, resourceType)
        )
      )
      .returning();

    if (!row) {
      return null;
    }
    if (updates.authType) {
      await tx
        .delete(mcpOAuthCredentials)
        .where(
          eq(mcpOAuthCredentials.serverIntegrationId, scope.integrationId)
        );
    }
    return tx.query.mcpServerIntegrations.findFirst({
      where: and(
        eq(mcpServerIntegrations.id, scope.integrationId),
        eq(mcpServerIntegrations.organizationId, scope.organizationId),
        eq(mcpServerIntegrations.resourceType, resourceType)
      ),
      with: {
        createdByUser: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        oauthCredential: { columns: { status: true } },
      },
    });
  });

  if (updated) {
    await refreshMcpToolIndexForIntegration({
      organizationId: updated.organizationId,
      integrationId: updated.id,
    }).catch(() => undefined);
  }

  return updated ?? null;
}

export function updateMcpConnectionIntegration(
  scope: McpServerIntegrationScope,
  updates: UpdateMcpServerIntegrationParams
) {
  return updateMcpServerIntegration(scope, "connection", updates);
}

export function updateMcpStoreListing(
  scope: McpServerIntegrationScope,
  updates: UpdateMcpServerIntegrationParams
) {
  return updateMcpServerIntegration(scope, "store_listing", updates);
}

async function deleteMcpServerIntegration(
  scope: McpServerIntegrationScope,
  resourceType: McpIntegrationResourceType
) {
  const deleted = await db
    .delete(mcpServerIntegrations)
    .where(
      and(
        eq(mcpServerIntegrations.id, scope.integrationId),
        eq(mcpServerIntegrations.organizationId, scope.organizationId),
        eq(mcpServerIntegrations.resourceType, resourceType)
      )
    )
    .returning({ id: mcpServerIntegrations.id });
  return deleted.length > 0;
}

export function deleteMcpConnectionIntegration(
  scope: McpServerIntegrationScope
) {
  return deleteMcpServerIntegration(scope, "connection");
}

export function deleteMcpStoreListing(scope: McpServerIntegrationScope) {
  return deleteMcpServerIntegration(scope, "store_listing");
}

export async function listMcpServerToolsPreview(input: {
  url: string;
  headers?: McpHeaderMap;
}) {
  const timeoutMs = 8000;
  const client = new Client({ name: "notra-console", version: "0.0.1" });

  try {
    await assertPublicHttpUrlResolution(input.url);
    const transport = new StreamableHTTPClientTransport(new URL(input.url), {
      fetch: publicMcpRuntimeFetch,
      requestInit: {
        headers: input.headers ?? {},
        redirect: "error",
      },
    });
    await client.connect(transport, {
      signal: AbortSignal.timeout(timeoutMs),
      timeout: timeoutMs,
    });
    const tools: McpPreviewTool[] = [];
    let cursor: string | undefined;
    do {
      const result = await client.listTools(cursor ? { cursor } : {}, {
        signal: AbortSignal.timeout(timeoutMs),
        timeout: timeoutMs,
      });
      tools.push(...result.tools);
      cursor = result.nextCursor;
    } while (cursor);

    return tools.map((tool) => ({
      name: tool.name,
      title: tool.title ?? null,
      description: tool.description ?? null,
    }));
  } finally {
    await client.close().catch(() => undefined);
  }
}

export async function testMcpServerConnection(input: {
  url: string;
  headers?: McpHeaderMap;
}) {
  const timeoutMs = 8000;
  const client = new Client({ name: "notra-dashboard", version: "0.0.1" });

  try {
    await assertPublicHttpUrlResolution(input.url);
    const transport = new StreamableHTTPClientTransport(new URL(input.url), {
      fetch: publicMcpRuntimeFetch,
      requestInit: {
        headers: input.headers ?? {},
        redirect: "error",
      },
    });
    await client.connect(transport, {
      signal: AbortSignal.timeout(timeoutMs),
      timeout: timeoutMs,
    });
    await client.ping({
      signal: AbortSignal.timeout(timeoutMs),
      timeout: timeoutMs,
    });
    const definitions = await client.listTools(
      {},
      {
        signal: AbortSignal.timeout(timeoutMs),
        timeout: timeoutMs,
      }
    );
    const toolCount = definitions.tools.length;

    return {
      success: true,
      status: null,
      message: `Server reachable. Discovered ${toolCount} ${toolCount === 1 ? "tool" : "tools"}. Tool execution and account access have not been tested.`,
      toolCount,
    };
  } catch {
    return {
      success: false,
      status: null,
      message: "Could not reach the MCP server. Check the URL and headers.",
      toolCount: 0,
    };
  } finally {
    await client.close().catch(() => undefined);
  }
}
