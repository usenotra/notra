import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { logError } from "@notra/ai/utils/server-log";
import { db } from "@notra/db/drizzle";
import {
  mcpServerIntegrations,
  mcpSessionToolActivations,
  mcpToolIndex,
} from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { captureServerEvent, flushPostHogServer } from "@notra/posthog/server";
import { assertPublicHttpUrlResolution } from "@notra/utils/url";
import {
  and,
  count,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  notInArray,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { customAlphabet } from "nanoid";

import {
  MCP_ACTIVATE_BATCH_LIMIT,
  MCP_INDEX_TIMEOUT_MS,
  MCP_MAX_RUNTIME_WRAPPERS,
  MCP_SEARCH_LIMIT_DEFAULT,
  MCP_SEARCH_LIMIT_MAX,
  MCP_SESSION_ACTIVE_TOOL_LIMIT,
  MCP_TOOL_ACTIVATION_OUTCOMES,
} from "../constants/mcp-tool-index";
import type { McpRequestAuth } from "../types/mcp-oauth";
import type {
  GetSessionActivatedMcpToolsParams,
  IndexedMcpTool,
  McpSessionSurface,
  McpToolActionPhrases,
  McpToolDefinition,
  McpToolIndexTransaction,
  QuerySessionActivatedMcpToolsParams,
} from "../types/mcp-tool-index";
import { publicMcpRuntimeFetch } from "../utils/mcp-fetch";
import { createMcpToolFingerprint } from "../utils/mcp-tool-fingerprint";
import { getMcpRequestAuth, withMcpOAuthRetry } from "./mcp-auth";
import { createMcpRuntimeToolName } from "./mcp-tool-name";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);
export async function refreshMcpToolIndexForOrganization({
  organizationId,
}: {
  organizationId: string;
}) {
  const integrations = await db.query.mcpServerIntegrations.findMany({
    where: and(
      eq(mcpServerIntegrations.organizationId, organizationId),
      eq(mcpServerIntegrations.enabled, true),
      eq(mcpServerIntegrations.resourceType, "connection")
    ),
    columns: {
      id: true,
    },
  });

  const results: Array<{ integrationId: string; indexedToolCount: number }> =
    [];
  for (const integration of integrations) {
    try {
      results.push(
        await refreshMcpToolIndexForIntegration({
          organizationId,
          integrationId: integration.id,
        })
      );
    } catch (error) {
      logError("[MCP Tool Index] Organization refresh failed", error, {
        organizationId,
        integrationId: integration.id,
      });
    }
  }

  return results;
}

export async function refreshMcpToolIndexForIntegration({
  organizationId,
  integrationId,
}: {
  organizationId: string;
  integrationId: string;
}) {
  const integration = await db.query.mcpServerIntegrations.findFirst({
    where: and(
      eq(mcpServerIntegrations.id, integrationId),
      eq(mcpServerIntegrations.organizationId, organizationId)
    ),
  });

  if (!integration) {
    throw new Error("MCP server integration not found.");
  }

  const sourceToolPhrases = integration.storeSourceIntegrationId
    ? await db.query.mcpToolIndex.findMany({
        where: and(
          eq(
            mcpToolIndex.serverIntegrationId,
            integration.storeSourceIntegrationId
          ),
          eq(mcpToolIndex.status, "active")
        ),
        columns: {
          serverToolName: true,
          actionPhrasePresent: true,
          actionPhrasePast: true,
        },
      })
    : [];
  const sourceToolPhrasesByName = new Map(
    sourceToolPhrases.map((tool) => [
      tool.serverToolName,
      {
        present: tool.actionPhrasePresent,
        past: tool.actionPhrasePast,
      },
    ])
  );

  if (!integration.enabled) {
    await db
      .update(mcpServerIntegrations)
      .set({
        toolSyncStatus: "idle",
        indexedToolCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(mcpServerIntegrations.id, integrationId));
    return { integrationId, indexedToolCount: 0 };
  }

  await db
    .update(mcpServerIntegrations)
    .set({
      toolSyncStatus: "syncing",
      toolSyncError: null,
      updatedAt: new Date(),
    })
    .where(eq(mcpServerIntegrations.id, integrationId));

  let client: MCPClient | null = null;
  const seenToolNames = new Set<string>();

  try {
    await assertPublicHttpUrlResolution(integration.url);
    const requestAuth = await getMcpRequestAuth(integrationId, organizationId);
    const listing = await withMcpOAuthRetry({
      integrationId,
      organizationId,
      requestAuth,
      operation: async (nextAuth) =>
        listMcpToolsForIndex(
          integration.url,
          integrationId,
          organizationId,
          nextAuth
        ),
    });
    client = listing.client;
    for (const definition of listing.definitions) {
      seenToolNames.add(definition.name);
    }

    const indexedToolCount = await db.transaction(async (tx) => {
      for (const definition of listing.definitions) {
        await upsertIndexedTool({
          database: tx,
          organizationId,
          integration: {
            id: integration.id,
            name: integration.name,
            description: integration.description,
          },
          definition,
          actionPhrases: sourceToolPhrasesByName.get(definition.name),
        });
      }

      if (seenToolNames.size > 0) {
        await tx
          .update(mcpToolIndex)
          .set({
            status: "stale",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(mcpToolIndex.serverIntegrationId, integrationId),
              notInArray(
                mcpToolIndex.serverToolName,
                Array.from(seenToolNames)
              ),
              sql`coalesce(${mcpToolIndex.meta} ->> 'notraManual', 'false') <> 'true'`
            )
          );
      } else {
        await tx
          .update(mcpToolIndex)
          .set({
            status: "stale",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(mcpToolIndex.serverIntegrationId, integrationId),
              sql`coalesce(${mcpToolIndex.meta} ->> 'notraManual', 'false') <> 'true'`
            )
          );
      }

      const [toolCount] = await tx
        .select({ value: count() })
        .from(mcpToolIndex)
        .where(
          and(
            eq(mcpToolIndex.serverIntegrationId, integrationId),
            eq(mcpToolIndex.status, "active")
          )
        );
      const activeToolCount = toolCount?.value ?? 0;

      await tx
        .update(mcpServerIntegrations)
        .set({
          lastToolSyncAt: new Date(),
          toolSyncStatus: "synced",
          toolSyncError: null,
          indexedToolCount: activeToolCount,
          updatedAt: new Date(),
        })
        .where(eq(mcpServerIntegrations.id, integrationId));

      return activeToolCount;
    });

    return { integrationId, indexedToolCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(mcpServerIntegrations)
      .set({
        lastToolSyncAt: new Date(),
        toolSyncStatus: "error",
        toolSyncError: sanitizeErrorMessage(message),
        updatedAt: new Date(),
      })
      .where(eq(mcpServerIntegrations.id, integrationId));

    logError("[MCP Tool Index] Refresh failed", error, {
      integrationId,
      organizationId,
    });
    throw error;
  } finally {
    await client?.close().catch(() => undefined);
  }
}

export async function searchMcpToolIndex({
  organizationId,
  query,
  serverIntegrationId,
  limit = MCP_SEARCH_LIMIT_DEFAULT,
}: {
  organizationId: string;
  query: string;
  serverIntegrationId?: string;
  limit?: number;
}) {
  const normalizedQuery = query.replace(/\s+/g, " ").trim();
  const boundedLimit = Math.min(Math.max(limit, 1), MCP_SEARCH_LIMIT_MAX);

  const activeCount = await db
    .select({ value: count() })
    .from(mcpToolIndex)
    .innerJoin(
      mcpServerIntegrations,
      eq(mcpToolIndex.serverIntegrationId, mcpServerIntegrations.id)
    )
    .where(
      and(
        eq(mcpToolIndex.organizationId, organizationId),
        eq(mcpToolIndex.status, "active"),
        eq(mcpServerIntegrations.enabled, true),
        eq(mcpServerIntegrations.resourceType, "connection")
      )
    )
    .then((rows) => Number(rows[0]?.value ?? 0));

  if (activeCount === 0) {
    await refreshMcpToolIndexForOrganization({ organizationId }).catch(
      (error) => {
        logError("[MCP Tool Index] Refresh during search failed", error, {
          organizationId,
        });
      }
    );
  }

  const where = and(
    eq(mcpToolIndex.organizationId, organizationId),
    eq(mcpToolIndex.status, "active"),
    eq(mcpServerIntegrations.enabled, true),
    eq(mcpServerIntegrations.resourceType, "connection"),
    serverIntegrationId
      ? eq(mcpToolIndex.serverIntegrationId, serverIntegrationId)
      : undefined,
    normalizedQuery
      ? or(
          sql`to_tsvector('english', ${mcpToolIndex.searchText}) @@ plainto_tsquery('english', ${normalizedQuery})`,
          ilike(mcpToolIndex.searchText, `%${normalizedQuery}%`),
          ilike(mcpToolIndex.runtimeToolName, `%${normalizedQuery}%`),
          ilike(mcpServerIntegrations.name, `%${normalizedQuery}%`)
        )
      : undefined
  );

  return db
    .select({
      tool: mcpToolIndex,
      serverName: mcpServerIntegrations.name,
      serverUrl: mcpServerIntegrations.url,
      serverEnabled: mcpServerIntegrations.enabled,
      serverLogoLightUrl: mcpServerIntegrations.logoLightUrl,
      serverLogoDarkUrl: mcpServerIntegrations.logoDarkUrl,
      rank: normalizedQuery
        ? sql<number>`ts_rank_cd(to_tsvector('english', ${mcpToolIndex.searchText}), plainto_tsquery('english', ${normalizedQuery}))`
        : sql<number>`0`,
    })
    .from(mcpToolIndex)
    .innerJoin(
      mcpServerIntegrations,
      eq(mcpToolIndex.serverIntegrationId, mcpServerIntegrations.id)
    )
    .where(where)
    .orderBy(
      normalizedQuery
        ? sql`ts_rank_cd(to_tsvector('english', ${mcpToolIndex.searchText}), plainto_tsquery('english', ${normalizedQuery})) desc`
        : sql`${mcpToolIndex.runtimeToolName} asc`,
      mcpToolIndex.runtimeToolName
    )
    .limit(boundedLimit)
    .then((rows) =>
      rows.map((row) =>
        toIndexedMcpTool(row.tool, {
          serverName: row.serverName,
          serverUrl: row.serverUrl,
          serverEnabled: row.serverEnabled,
          serverLogoLightUrl: row.serverLogoLightUrl,
          serverLogoDarkUrl: row.serverLogoDarkUrl,
        })
      )
    );
}

export async function getIndexedMcpToolsForRuntime({
  organizationId,
  limit = MCP_MAX_RUNTIME_WRAPPERS,
}: {
  organizationId: string;
  limit?: number;
}) {
  return db
    .select({
      tool: mcpToolIndex,
      serverName: mcpServerIntegrations.name,
      serverUrl: mcpServerIntegrations.url,
      serverEnabled: mcpServerIntegrations.enabled,
      serverLogoLightUrl: mcpServerIntegrations.logoLightUrl,
      serverLogoDarkUrl: mcpServerIntegrations.logoDarkUrl,
    })
    .from(mcpToolIndex)
    .innerJoin(
      mcpServerIntegrations,
      eq(mcpToolIndex.serverIntegrationId, mcpServerIntegrations.id)
    )
    .where(
      and(
        eq(mcpToolIndex.organizationId, organizationId),
        eq(mcpToolIndex.status, "active"),
        eq(mcpServerIntegrations.enabled, true),
        eq(mcpServerIntegrations.resourceType, "connection")
      )
    )
    .orderBy(mcpToolIndex.runtimeToolName)
    .limit(limit)
    .then((rows) =>
      rows.map((row) =>
        toIndexedMcpTool(row.tool, {
          serverName: row.serverName,
          serverUrl: row.serverUrl,
          serverEnabled: row.serverEnabled,
          serverLogoLightUrl: row.serverLogoLightUrl,
          serverLogoDarkUrl: row.serverLogoDarkUrl,
        })
      )
    );
}

export async function hasActiveIndexedMcpToolsForOrganization({
  organizationId,
}: {
  organizationId: string;
}) {
  const [row] = await db
    .select({ value: count() })
    .from(mcpToolIndex)
    .innerJoin(
      mcpServerIntegrations,
      eq(mcpToolIndex.serverIntegrationId, mcpServerIntegrations.id)
    )
    .where(
      and(
        eq(mcpToolIndex.organizationId, organizationId),
        eq(mcpToolIndex.status, "active"),
        eq(mcpServerIntegrations.enabled, true),
        eq(mcpServerIntegrations.resourceType, "connection")
      )
    )
    .limit(1);

  return (row?.value ?? 0) > 0;
}

export async function getSessionActivatedMcpTools(
  params: GetSessionActivatedMcpToolsParams
) {
  return querySessionActivatedMcpTools({ database: db, ...params });
}

async function querySessionActivatedMcpTools({
  database,
  organizationId,
  sessionId,
  surface,
  serverIntegrationIds,
}: QuerySessionActivatedMcpToolsParams) {
  if (serverIntegrationIds?.length === 0) {
    return [];
  }

  const now = new Date();
  return database
    .select({
      activation: mcpSessionToolActivations,
      tool: mcpToolIndex,
      serverName: mcpServerIntegrations.name,
      serverUrl: mcpServerIntegrations.url,
      serverEnabled: mcpServerIntegrations.enabled,
      serverLogoLightUrl: mcpServerIntegrations.logoLightUrl,
      serverLogoDarkUrl: mcpServerIntegrations.logoDarkUrl,
    })
    .from(mcpSessionToolActivations)
    .innerJoin(
      mcpToolIndex,
      eq(mcpSessionToolActivations.mcpToolIndexId, mcpToolIndex.id)
    )
    .innerJoin(
      mcpServerIntegrations,
      eq(mcpToolIndex.serverIntegrationId, mcpServerIntegrations.id)
    )
    .where(
      and(
        eq(mcpSessionToolActivations.organizationId, organizationId),
        eq(mcpSessionToolActivations.sessionId, sessionId),
        eq(mcpSessionToolActivations.surface, surface),
        eq(mcpToolIndex.organizationId, organizationId),
        eq(mcpToolIndex.status, "active"),
        eq(mcpServerIntegrations.enabled, true),
        eq(mcpServerIntegrations.resourceType, "connection"),
        serverIntegrationIds
          ? inArray(mcpToolIndex.serverIntegrationId, serverIntegrationIds)
          : undefined,
        or(
          isNull(mcpSessionToolActivations.expiresAt),
          gt(mcpSessionToolActivations.expiresAt, now)
        )
      )
    )
    .orderBy(mcpSessionToolActivations.activatedAt)
    .then((rows) =>
      rows.map((row) => ({
        ...toIndexedMcpTool(row.tool, {
          serverName: row.serverName,
          serverUrl: row.serverUrl,
          serverEnabled: row.serverEnabled,
          serverLogoLightUrl: row.serverLogoLightUrl,
          serverLogoDarkUrl: row.serverLogoDarkUrl,
        }),
        activationId: row.activation.id,
        sourceQuery: row.activation.sourceQuery,
        activatedAt: row.activation.activatedAt,
        lastUsedAt: row.activation.lastUsedAt,
      }))
    );
}

export async function activateSessionMcpTools({
  organizationId,
  sessionId,
  surface,
  toolIds,
  sourceQuery,
  serverIntegrationIds,
}: {
  organizationId: string;
  sessionId: string;
  surface: McpSessionSurface;
  toolIds: string[];
  sourceQuery?: string;
  serverIntegrationIds?: string[];
}) {
  const uniqueToolIds = Array.from(new Set(toolIds));
  if (uniqueToolIds.length === 0) {
    return [];
  }
  if (uniqueToolIds.length > MCP_ACTIVATE_BATCH_LIMIT) {
    throw new Error(
      `Activate at most ${MCP_ACTIVATE_BATCH_LIMIT} MCP tools at a time.`
    );
  }

  let tools = await getToolsByIds(organizationId, uniqueToolIds);
  const allowedServerIntegrationIds = serverIntegrationIds
    ? new Set(serverIntegrationIds)
    : null;
  if (
    allowedServerIntegrationIds &&
    tools.some(
      (tool) => !allowedServerIntegrationIds.has(tool.serverIntegrationId)
    )
  ) {
    throw new Error(
      "One or more MCP tools are outside the selected server context."
    );
  }
  const staleIntegrationIds = new Set(
    tools
      .filter((tool) => tool.status === "stale")
      .map((tool) => tool.serverIntegrationId)
  );
  for (const integrationId of staleIntegrationIds) {
    await refreshMcpToolIndexForIntegration({
      organizationId,
      integrationId,
    }).catch((error) => {
      logError("[MCP Tool Index] Stale refresh failed", error, {
        organizationId,
        integrationId,
      });
    });
  }
  if (staleIntegrationIds.size > 0) {
    tools = await getToolsByIds(organizationId, uniqueToolIds);
  }

  const activeTools = tools.filter(
    (tool) => tool.status === "active" && tool.serverEnabled
  );
  if (activeTools.length !== uniqueToolIds.length) {
    throw new Error("One or more MCP tools are unavailable.");
  }

  const activated = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`mcp-session-tool-activation:${organizationId}:${sessionId}:${surface}`}, 0))`
    );

    const existing = await querySessionActivatedMcpTools({
      database: tx,
      organizationId,
      sessionId,
      surface,
    });
    const existingIds = new Set(existing.map((tool) => tool.id));
    const newCount = activeTools.filter(
      (tool) => !existingIds.has(tool.id)
    ).length;
    if (existing.length + newCount > MCP_SESSION_ACTIVE_TOOL_LIMIT) {
      throw new Error(
        `This session can activate at most ${MCP_SESSION_ACTIVE_TOOL_LIMIT} MCP tools. Deactivate unused tools first.`
      );
    }

    await tx
      .insert(mcpSessionToolActivations)
      .values(
        activeTools.map((tool) => ({
          id: `mcpa_${nanoid()}`,
          organizationId,
          sessionId,
          surface,
          mcpToolIndexId: tool.id,
          runtimeToolName: tool.runtimeToolName,
          sourceQuery: sourceQuery ?? null,
        }))
      )
      .onConflictDoUpdate({
        target: [
          mcpSessionToolActivations.organizationId,
          mcpSessionToolActivations.sessionId,
          mcpSessionToolActivations.surface,
          mcpSessionToolActivations.mcpToolIndexId,
        ],
        set: {
          runtimeToolName: sql`excluded.runtime_tool_name`,
          sourceQuery: sql`excluded.source_query`,
        },
      });

    for (const tool of activeTools) {
      captureServerEvent({
        event: POSTHOG_EVENTS.MCP_TOOL_ACTIVATED,
        organizationId,
        properties: {
          server_id: tool.serverIntegrationId,
          tool_name: tool.serverToolName,
          surface,
          outcome: existingIds.has(tool.id)
            ? MCP_TOOL_ACTIVATION_OUTCOMES.ALREADY_ACTIVE
            : MCP_TOOL_ACTIVATION_OUTCOMES.ACTIVATED,
        },
      });
    }

    return querySessionActivatedMcpTools({
      database: tx,
      organizationId,
      sessionId,
      surface,
      serverIntegrationIds,
    });
  });

  void flushPostHogServer();

  return activated;
}

export async function deactivateSessionMcpTools({
  organizationId,
  sessionId,
  surface,
  toolIds,
  runtimeToolNames,
  serverIntegrationIds,
}: {
  organizationId: string;
  sessionId: string;
  surface: McpSessionSurface;
  toolIds?: string[];
  runtimeToolNames?: string[];
  serverIntegrationIds?: string[];
}) {
  if (serverIntegrationIds?.length === 0) {
    return { deactivated: 0 };
  }

  const conditions = [
    eq(mcpSessionToolActivations.organizationId, organizationId),
    eq(mcpSessionToolActivations.sessionId, sessionId),
    eq(mcpSessionToolActivations.surface, surface),
  ];

  if (serverIntegrationIds) {
    const selectedServerToolIds = db
      .select({ id: mcpToolIndex.id })
      .from(mcpToolIndex)
      .where(
        and(
          eq(mcpToolIndex.organizationId, organizationId),
          inArray(mcpToolIndex.serverIntegrationId, serverIntegrationIds)
        )
      );
    conditions.push(
      inArray(mcpSessionToolActivations.mcpToolIndexId, selectedServerToolIds)
    );
  }

  const requestedToolConditions: SQL[] = [];
  if (toolIds?.length) {
    requestedToolConditions.push(
      inArray(mcpSessionToolActivations.mcpToolIndexId, toolIds)
    );
  }
  if (runtimeToolNames?.length) {
    const currentRuntimeNameToolIds = db
      .select({ id: mcpToolIndex.id })
      .from(mcpToolIndex)
      .where(
        and(
          eq(mcpToolIndex.organizationId, organizationId),
          inArray(mcpToolIndex.runtimeToolName, runtimeToolNames)
        )
      );
    const runtimeNameCondition = or(
      inArray(mcpSessionToolActivations.runtimeToolName, runtimeToolNames),
      inArray(
        mcpSessionToolActivations.mcpToolIndexId,
        currentRuntimeNameToolIds
      )
    );
    if (runtimeNameCondition) {
      requestedToolConditions.push(runtimeNameCondition);
    }
  }

  const requestedToolCondition = or(...requestedToolConditions);
  if (!requestedToolCondition) {
    return { deactivated: 0 };
  }
  conditions.push(requestedToolCondition);

  const deleted = await db
    .delete(mcpSessionToolActivations)
    .where(and(...conditions))
    .returning({ id: mcpSessionToolActivations.id });

  return { deactivated: deleted.length };
}

export async function getIndexedMcpToolByRuntimeName({
  organizationId,
  runtimeToolName,
}: {
  organizationId: string;
  runtimeToolName: string;
}) {
  const [row] = await db
    .select({
      tool: mcpToolIndex,
      serverName: mcpServerIntegrations.name,
      serverUrl: mcpServerIntegrations.url,
      serverEnabled: mcpServerIntegrations.enabled,
      serverLogoLightUrl: mcpServerIntegrations.logoLightUrl,
      serverLogoDarkUrl: mcpServerIntegrations.logoDarkUrl,
    })
    .from(mcpToolIndex)
    .innerJoin(
      mcpServerIntegrations,
      eq(mcpToolIndex.serverIntegrationId, mcpServerIntegrations.id)
    )
    .where(
      and(
        eq(mcpToolIndex.organizationId, organizationId),
        eq(mcpToolIndex.runtimeToolName, runtimeToolName),
        eq(mcpToolIndex.status, "active"),
        eq(mcpServerIntegrations.enabled, true),
        eq(mcpServerIntegrations.resourceType, "connection")
      )
    )
    .limit(1);

  return row
    ? toIndexedMcpTool(row.tool, {
        serverName: row.serverName,
        serverUrl: row.serverUrl,
        serverEnabled: row.serverEnabled,
        serverLogoLightUrl: row.serverLogoLightUrl,
        serverLogoDarkUrl: row.serverLogoDarkUrl,
      })
    : null;
}

export async function isMcpToolActivatedForSession({
  organizationId,
  sessionId,
  surface,
  toolId,
}: {
  organizationId: string;
  sessionId: string;
  surface: McpSessionSurface;
  toolId: string;
}) {
  const now = new Date();
  const [row] = await db
    .select({ id: mcpSessionToolActivations.id })
    .from(mcpSessionToolActivations)
    .where(
      and(
        eq(mcpSessionToolActivations.organizationId, organizationId),
        eq(mcpSessionToolActivations.sessionId, sessionId),
        eq(mcpSessionToolActivations.surface, surface),
        eq(mcpSessionToolActivations.mcpToolIndexId, toolId),
        or(
          isNull(mcpSessionToolActivations.expiresAt),
          gt(mcpSessionToolActivations.expiresAt, now)
        )
      )
    )
    .limit(1);

  return Boolean(row);
}

export async function touchMcpSessionToolActivation({
  organizationId,
  sessionId,
  surface,
  toolId,
}: {
  organizationId: string;
  sessionId: string;
  surface: McpSessionSurface;
  toolId: string;
}) {
  await db
    .update(mcpSessionToolActivations)
    .set({ lastUsedAt: new Date() })
    .where(
      and(
        eq(mcpSessionToolActivations.organizationId, organizationId),
        eq(mcpSessionToolActivations.sessionId, sessionId),
        eq(mcpSessionToolActivations.surface, surface),
        eq(mcpSessionToolActivations.mcpToolIndexId, toolId)
      )
    );
}

export async function markMcpToolIndexRowStale({
  organizationId,
  toolId,
  errorMessage,
}: {
  organizationId: string;
  toolId: string;
  errorMessage?: string;
}) {
  await db
    .update(mcpToolIndex)
    .set({
      status: "stale",
      errorMessage: errorMessage ? sanitizeErrorMessage(errorMessage) : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mcpToolIndex.id, toolId),
        eq(mcpToolIndex.organizationId, organizationId)
      )
    );
}

export async function getEnabledMcpServerCount(organizationId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(mcpServerIntegrations)
    .where(
      and(
        eq(mcpServerIntegrations.organizationId, organizationId),
        eq(mcpServerIntegrations.enabled, true),
        eq(mcpServerIntegrations.resourceType, "connection")
      )
    );
  return Number(row?.value ?? 0);
}

async function listMcpToolsForIndex(
  url: string,
  integrationId: string,
  organizationId: string,
  requestAuth: McpRequestAuth
) {
  const client = await createMCPClient({
    clientName: "notra",
    version: "0.0.1",
    transport: {
      type: "http",
      url,
      headers: requestAuth.headers,
      fetch: publicMcpRuntimeFetch,
      redirect: "error",
    },
    onUncaughtError: (error) => {
      logError("[MCP Tool Index] Uncaught client error", error, {
        integrationId,
        organizationId,
      });
    },
  });

  try {
    const definitions: McpToolDefinition[] = [];
    let cursor: string | undefined;
    do {
      const result = await client.listTools({
        params: cursor ? { cursor } : undefined,
        options: {
          signal: AbortSignal.timeout(MCP_INDEX_TIMEOUT_MS),
        },
      });
      definitions.push(...result.tools);
      cursor = result.nextCursor;
    } while (cursor);
    return { client, definitions };
  } catch (error) {
    await client.close().catch(() => undefined);
    throw error;
  }
}

async function upsertIndexedTool({
  database,
  organizationId,
  integration,
  definition,
  actionPhrases,
}: {
  database: McpToolIndexTransaction;
  organizationId: string;
  integration: {
    id: string;
    name: string;
    description: string | null;
  };
  definition: McpToolDefinition;
  actionPhrases?: McpToolActionPhrases;
}) {
  const runtimeToolName = await createUniqueRuntimeToolName({
    database,
    organizationId,
    integrationId: integration.id,
    serverName: integration.name,
    serverToolName: definition.name,
  });
  const searchText = createSearchText({
    integrationName: integration.name,
    integrationDescription: integration.description,
    definition,
    runtimeToolName,
  });
  const schemaHash = createMcpToolFingerprint({
    name: definition.name,
    title: definition.title,
    description: definition.description,
    inputSchema: definition.inputSchema,
    outputSchema: definition.outputSchema,
    annotations: definition.annotations,
    meta: definition._meta,
  });

  try {
    await database.transaction((tx) =>
      upsertIndexedToolWithRuntimeName({
        database: tx,
        organizationId,
        integrationId: integration.id,
        definition,
        runtimeToolName,
        searchText,
        schemaHash,
        actionPhrases,
      })
    );
  } catch (error) {
    if (!isRuntimeToolNameConflict(error)) {
      throw error;
    }

    const collisionRuntimeToolName = createMcpRuntimeToolName({
      integrationId: integration.id,
      serverName: integration.name,
      serverToolName: definition.name,
      withHash: true,
    });
    await upsertIndexedToolWithRuntimeName({
      database,
      organizationId,
      integrationId: integration.id,
      definition,
      runtimeToolName: collisionRuntimeToolName,
      searchText: createSearchText({
        integrationName: integration.name,
        integrationDescription: integration.description,
        definition,
        runtimeToolName: collisionRuntimeToolName,
      }),
      schemaHash,
      actionPhrases,
    });
  }
}

async function upsertIndexedToolWithRuntimeName({
  database,
  organizationId,
  integrationId,
  definition,
  runtimeToolName,
  searchText,
  schemaHash,
  actionPhrases,
}: {
  database: McpToolIndexTransaction;
  organizationId: string;
  integrationId: string;
  definition: McpToolDefinition;
  runtimeToolName: string;
  searchText: string;
  schemaHash: string;
  actionPhrases?: McpToolActionPhrases;
}) {
  await database
    .insert(mcpToolIndex)
    .values({
      id: `mcpt_${nanoid()}`,
      organizationId,
      serverIntegrationId: integrationId,
      serverToolName: definition.name,
      runtimeToolName,
      title: definition.title ?? definition.annotations?.title ?? null,
      description: definition.description ?? null,
      actionPhrasePresent: actionPhrases?.present ?? null,
      actionPhrasePast: actionPhrases?.past ?? null,
      inputSchema: definition.inputSchema,
      outputSchema: definition.outputSchema ?? null,
      annotations: definition.annotations ?? null,
      meta: definition._meta ?? null,
      schemaHash,
      searchText,
      status: "active",
      lastSeenAt: new Date(),
      lastIndexedAt: new Date(),
      errorMessage: null,
    })
    .onConflictDoUpdate({
      target: [mcpToolIndex.serverIntegrationId, mcpToolIndex.serverToolName],
      set: {
        runtimeToolName,
        title: definition.title ?? definition.annotations?.title ?? null,
        description: definition.description ?? null,
        ...(actionPhrases
          ? {
              actionPhrasePresent: actionPhrases.present,
              actionPhrasePast: actionPhrases.past,
            }
          : {}),
        inputSchema: definition.inputSchema,
        outputSchema: definition.outputSchema ?? null,
        annotations: definition.annotations ?? null,
        meta: definition._meta ?? null,
        schemaHash,
        searchText,
        status: "active",
        lastSeenAt: new Date(),
        lastIndexedAt: new Date(),
        errorMessage: null,
        updatedAt: new Date(),
      },
    });
}

async function getToolsByIds(organizationId: string, toolIds: string[]) {
  if (!toolIds.length) {
    return [];
  }

  return db
    .select({
      tool: mcpToolIndex,
      serverName: mcpServerIntegrations.name,
      serverUrl: mcpServerIntegrations.url,
      serverEnabled: mcpServerIntegrations.enabled,
      serverLogoLightUrl: mcpServerIntegrations.logoLightUrl,
      serverLogoDarkUrl: mcpServerIntegrations.logoDarkUrl,
    })
    .from(mcpToolIndex)
    .innerJoin(
      mcpServerIntegrations,
      eq(mcpToolIndex.serverIntegrationId, mcpServerIntegrations.id)
    )
    .where(
      and(
        eq(mcpToolIndex.organizationId, organizationId),
        inArray(mcpToolIndex.id, toolIds),
        eq(mcpServerIntegrations.enabled, true),
        eq(mcpServerIntegrations.resourceType, "connection")
      )
    )
    .then((rows) =>
      rows.map((row) =>
        toIndexedMcpTool(row.tool, {
          serverName: row.serverName,
          serverUrl: row.serverUrl,
          serverEnabled: row.serverEnabled,
          serverLogoLightUrl: row.serverLogoLightUrl,
          serverLogoDarkUrl: row.serverLogoDarkUrl,
        })
      )
    );
}

function toIndexedMcpTool(
  row: typeof mcpToolIndex.$inferSelect,
  server: {
    serverName: string;
    serverUrl: string;
    serverEnabled: boolean;
    serverLogoLightUrl: string | null;
    serverLogoDarkUrl: string | null;
  }
): IndexedMcpTool {
  return {
    id: row.id,
    organizationId: row.organizationId,
    serverIntegrationId: row.serverIntegrationId,
    serverToolName: row.serverToolName,
    runtimeToolName: row.runtimeToolName,
    title: row.title,
    description: row.description,
    actionPhrasePresent: row.actionPhrasePresent,
    actionPhrasePast: row.actionPhrasePast,
    inputSchema: row.inputSchema,
    outputSchema: row.outputSchema,
    annotations: row.annotations,
    meta: row.meta,
    schemaHash: row.schemaHash,
    searchText: row.searchText,
    status: row.status,
    serverName: server.serverName,
    serverUrl: server.serverUrl,
    serverEnabled: server.serverEnabled,
    serverLogoLightUrl: server.serverLogoLightUrl,
    serverLogoDarkUrl: server.serverLogoDarkUrl,
  };
}

async function createUniqueRuntimeToolName({
  database,
  organizationId,
  integrationId,
  serverName,
  serverToolName,
}: {
  database: McpToolIndexTransaction;
  organizationId: string;
  integrationId: string;
  serverName: string;
  serverToolName: string;
}) {
  const runtimeToolName = createMcpRuntimeToolName({
    integrationId,
    serverName,
    serverToolName,
  });
  const [existing] = await database
    .select({
      serverIntegrationId: mcpToolIndex.serverIntegrationId,
      serverToolName: mcpToolIndex.serverToolName,
    })
    .from(mcpToolIndex)
    .where(
      and(
        eq(mcpToolIndex.organizationId, organizationId),
        eq(mcpToolIndex.runtimeToolName, runtimeToolName)
      )
    )
    .limit(1);

  if (
    !existing ||
    (existing.serverIntegrationId === integrationId &&
      existing.serverToolName === serverToolName)
  ) {
    return runtimeToolName;
  }

  return createMcpRuntimeToolName({
    integrationId,
    serverName,
    serverToolName,
    withHash: true,
  });
}

function createSearchText({
  integrationName,
  integrationDescription,
  definition,
  runtimeToolName,
}: {
  integrationName: string;
  integrationDescription: string | null;
  definition: McpToolDefinition;
  runtimeToolName: string;
}) {
  return [
    integrationName,
    integrationDescription,
    runtimeToolName,
    definition.name,
    definition.title,
    definition.description,
    definition.annotations?.title,
    schemaPropertyNames(definition.inputSchema),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function schemaPropertyNames(inputSchema: unknown) {
  if (
    typeof inputSchema !== "object" ||
    inputSchema === null ||
    !("properties" in inputSchema)
  ) {
    return "";
  }
  const properties = (inputSchema as { properties?: unknown }).properties;
  if (typeof properties !== "object" || properties === null) {
    return "";
  }
  return Object.keys(properties).join(" ");
}

function sanitizeErrorMessage(message: string) {
  return message.replace(/\s+/g, " ").trim().slice(0, 1000);
}

function isRuntimeToolNameConflict(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.message.includes("mcpToolIndex_org_runtime_tool_uidx") ||
    error.message.includes(
      "mcp_tool_index_organization_id_runtime_tool_name"
    ) ||
    error.message.includes("runtime_tool_name")
  );
}
