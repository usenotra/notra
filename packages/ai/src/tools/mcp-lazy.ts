import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { db } from "@notra/db/drizzle";
import { mcpServerIntegrations } from "@notra/db/schema";
import { assertPublicHttpUrlResolution } from "@notra/utils/url";
import {
  dynamicTool,
  jsonSchema,
  type Tool,
  type ToolExecutionOptions,
  tool,
} from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  LAZY_MCP_DESCRIPTION,
  MCP_MANAGER_TOOL_NAMES,
  MCP_STALE_TOOL_ERROR_REGEX,
} from "../constants/mcp-runtime";
import {
  MCP_EXECUTION_TIMEOUT_MS,
  MCP_SEARCH_LIMIT_DEFAULT,
  MCP_SEARCH_LIMIT_MAX,
  MCP_SESSION_ACTIVE_TOOL_LIMIT,
} from "../constants/mcp-tool-index";
import { getMcpRequestAuth, withMcpOAuthRetry } from "../integrations/mcp-auth";
import {
  activateSessionMcpTools,
  deactivateSessionMcpTools,
  getIndexedMcpToolByRuntimeName,
  getSessionActivatedMcpTools,
  hasActiveIndexedMcpToolsForOrganization,
  isMcpToolActivatedForSession,
  markMcpToolIndexRowStale,
  refreshMcpToolIndexForOrganization,
  searchMcpToolIndex,
  touchMcpSessionToolActivation,
} from "../integrations/mcp-tool-index";
import type {
  ConnectMcpClientParams,
  CreateMcpClientForIntegrationParams,
  CreateRuntimeMcpToolParams,
  ExecuteMcpToolParams,
  GetMcpClientParams,
  LazyMcpRuntime,
  LazyMcpRuntimeParams,
  McpClientRegistry,
  RetiredMcpClients,
  RetireMcpClientParams,
} from "../types/mcp-runtime";
import type {
  ActivatedMcpTool,
  IndexedMcpTool,
  McpToolDefinition,
} from "../types/mcp-tool-index";
import { publicMcpRuntimeFetch } from "../utils/mcp-fetch";

export async function createLazyMcpRuntime({
  organizationId,
  sessionId,
  surface,
  baseActiveToolNames,
  tools: sharedTools,
  serverIntegrationIds,
}: LazyMcpRuntimeParams): Promise<LazyMcpRuntime> {
  const allowedServerIntegrationIds = serverIntegrationIds
    ? new Set(serverIntegrationIds)
    : null;
  const clients: McpClientRegistry = new Map();
  const retiredClients: RetiredMcpClients = new Set();
  const hasActiveIndexedTools = await hasActiveIndexedMcpToolsForOrganization({
    organizationId,
  });
  if (!hasActiveIndexedTools) {
    await refreshMcpToolIndexForOrganization({ organizationId }).catch(
      (error) => {
        console.error("[Lazy MCP Runtime Index Refresh Error]", {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    );
  }
  const activatedTools = await getSessionActivatedMcpTools({
    organizationId,
    sessionId,
    surface,
    serverIntegrationIds,
  });
  const activeMcpToolNames = new Set(
    activatedTools.map((tool) => tool.runtimeToolName)
  );

  const activeToolNames = new Set<string>([
    ...baseActiveToolNames,
    ...MCP_MANAGER_TOOL_NAMES,
    ...activeMcpToolNames,
  ]);

  const tools: Record<string, Tool> = sharedTools ?? {};
  const approvalToolNames = new Set<string>();

  const ensureRuntimeTool = (indexedTool: IndexedMcpTool) => {
    if (shouldRequireApproval(indexedTool.annotations)) {
      approvalToolNames.add(indexedTool.runtimeToolName);
    }
    tools[indexedTool.runtimeToolName] ??= createRuntimeMcpTool({
      organizationId,
      sessionId,
      surface,
      indexedTool,
      clients,
      retiredClients,
    });
  };

  const setActiveTools = (mcpTools: ActivatedMcpTool[]) => {
    for (const tool of mcpTools) {
      ensureRuntimeTool(tool);
      activeMcpToolNames.add(tool.runtimeToolName);
      activeToolNames.add(tool.runtimeToolName);
    }
  };

  const reconcileActiveTools = (mcpTools: ActivatedMcpTool[]) => {
    const nextActiveMcpToolNames = new Set(
      mcpTools.map((tool) => tool.runtimeToolName)
    );
    for (const runtimeToolName of activeMcpToolNames) {
      if (!nextActiveMcpToolNames.has(runtimeToolName)) {
        activeMcpToolNames.delete(runtimeToolName);
        activeToolNames.delete(runtimeToolName);
      }
    }
    setActiveTools(mcpTools);
  };

  Object.assign(tools, {
    searchMcpTools: tool({
      description:
        "Search indexed MCP tools by capability, service, or parameter name. Use this before activating unknown external tools.",
      inputSchema: z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(MCP_SEARCH_LIMIT_MAX).optional(),
        serverIntegrationId: z.string().min(1).optional(),
      }),
      execute: async ({ query, limit, serverIntegrationId }) => {
        if (
          serverIntegrationId &&
          allowedServerIntegrationIds &&
          !allowedServerIntegrationIds.has(serverIntegrationId)
        ) {
          throw new Error(
            "That MCP server is outside the selected server context."
          );
        }

        const boundedLimit = limit ?? MCP_SEARCH_LIMIT_DEFAULT;
        let scopedServerIntegrationIds: string[] | null = null;
        if (allowedServerIntegrationIds) {
          scopedServerIntegrationIds = serverIntegrationId
            ? [serverIntegrationId]
            : Array.from(allowedServerIntegrationIds);
        }
        const results = scopedServerIntegrationIds
          ? (
              await Promise.all(
                scopedServerIntegrationIds.map((scopedServerIntegrationId) =>
                  searchMcpToolIndex({
                    organizationId,
                    query,
                    limit: boundedLimit,
                    serverIntegrationId: scopedServerIntegrationId,
                  })
                )
              )
            )
              .flat()
              .filter(
                (result, index, allResults) =>
                  allResults.findIndex(
                    (candidate) => candidate.id === result.id
                  ) === index
              )
              .slice(0, boundedLimit)
          : await searchMcpToolIndex({
              organizationId,
              query,
              limit: boundedLimit,
              serverIntegrationId,
            });
        return {
          results: results.map((result) => ({
            toolId: result.id,
            runtimeToolName: result.runtimeToolName,
            serverName: result.serverName,
            title: result.title ?? undefined,
            description: result.description ?? undefined,
            inputSchemaSummary: summarizeJsonSchema(result.inputSchema),
            alreadyActive: activeMcpToolNames.has(result.runtimeToolName),
          })),
        };
      },
    }),
    activateMcpTools: tool({
      description:
        "Activate one or more MCP tools for this chat session so they can be called on the next agent step.",
      inputSchema: z.object({
        toolIds: z.array(z.string().min(1)).min(1),
        reason: z.string().max(500).optional(),
      }),
      execute: async ({ toolIds, reason }) => {
        const activated = await activateSessionMcpTools({
          organizationId,
          sessionId,
          surface,
          toolIds,
          sourceQuery: reason,
          serverIntegrationIds,
        });
        setActiveTools(activated);

        return {
          activated: activated
            .filter((activatedTool) => toolIds.includes(activatedTool.id))
            .map((activatedTool) => ({
              toolId: activatedTool.id,
              runtimeToolName: activatedTool.runtimeToolName,
              title: activatedTool.title ?? undefined,
              description: activatedTool.description ?? undefined,
              inputSchema: activatedTool.inputSchema,
            })),
        };
      },
    }),
    listActiveMcpTools: tool({
      description:
        "List MCP tools currently active in this chat session and available for use.",
      inputSchema: z.object({}),
      execute: async () => {
        const active = await getSessionActivatedMcpTools({
          organizationId,
          sessionId,
          surface,
          serverIntegrationIds,
        });
        reconcileActiveTools(active);
        return {
          activeTools: active.map((activeTool) => ({
            toolId: activeTool.id,
            runtimeToolName: activeTool.runtimeToolName,
            serverName: activeTool.serverName,
            title: activeTool.title ?? undefined,
            description: activeTool.description ?? undefined,
            inputSchemaSummary: summarizeJsonSchema(activeTool.inputSchema),
          })),
          limit: MCP_SESSION_ACTIVE_TOOL_LIMIT,
        };
      },
    }),
    deactivateMcpTools: tool({
      description:
        "Deactivate MCP tools that are no longer needed in this chat session.",
      inputSchema: z
        .object({
          toolIds: z.array(z.string().min(1)).optional(),
          runtimeToolNames: z.array(z.string().min(1)).optional(),
        })
        .refine(
          (value) =>
            Boolean(value.toolIds?.length) ||
            Boolean(value.runtimeToolNames?.length),
          "Provide toolIds or runtimeToolNames"
        ),
      execute: async ({ toolIds, runtimeToolNames }) => {
        const result = await deactivateSessionMcpTools({
          organizationId,
          sessionId,
          surface,
          toolIds,
          runtimeToolNames,
          serverIntegrationIds,
        });
        const active = await getSessionActivatedMcpTools({
          organizationId,
          sessionId,
          surface,
          serverIntegrationIds,
        });
        reconcileActiveTools(active);
        return result;
      },
    }),
  });

  setActiveTools(activatedTools);

  return {
    tools,
    initialActiveTools: Array.from(activeToolNames),
    prepareStep: async () => ({
      activeTools: Array.from(activeToolNames),
    }),
    requiresApproval: (toolName) => approvalToolNames.has(toolName),
    descriptions: [
      LAZY_MCP_DESCRIPTION,
      ...formatActiveToolDescriptions(activatedTools),
    ],
    cleanup: async () => {
      const settledClients = await Promise.allSettled([
        ...clients.values(),
        ...retiredClients,
      ]);
      await Promise.allSettled(
        settledClients.flatMap((result) =>
          result.status === "fulfilled" ? [result.value.client.close()] : []
        )
      );
      clients.clear();
      retiredClients.clear();
    },
  };
}

function createRuntimeMcpTool({
  organizationId,
  sessionId,
  surface,
  indexedTool,
  clients,
  retiredClients,
}: CreateRuntimeMcpToolParams): Tool {
  return dynamicTool({
    title: indexedTool.title ?? indexedTool.runtimeToolName,
    description:
      indexedTool.description ??
      `MCP tool ${indexedTool.serverToolName} from ${indexedTool.serverName}`,
    inputSchema: jsonSchema(toAiSdkInputJsonSchema(indexedTool.inputSchema)),
    execute: async (input, options) => {
      const isActivated = await isMcpToolActivatedForSession({
        organizationId,
        sessionId,
        surface,
        toolId: indexedTool.id,
      });

      if (!isActivated) {
        throw new Error(
          `MCP tool ${indexedTool.runtimeToolName} is not active for this session. Use activateMcpTools first.`
        );
      }

      try {
        const latestTool =
          (await getIndexedMcpToolByRuntimeName({
            organizationId,
            runtimeToolName: indexedTool.runtimeToolName,
          })) ?? indexedTool;
        if (latestTool.status !== "active" || !latestTool.serverEnabled) {
          throw new Error(
            `MCP tool ${indexedTool.runtimeToolName} is no longer available. Search and activate the tool again before retrying.`
          );
        }
        let clientEntry = await getMcpClient({
          organizationId,
          integrationId: latestTool.serverIntegrationId,
          clients,
        });
        const output = await withMcpOAuthRetry({
          integrationId: latestTool.serverIntegrationId,
          organizationId,
          requestAuth: clientEntry.requestAuth,
          operation: async (_requestAuth, isRetry) => {
            if (isRetry) {
              await retireMcpClient({
                clientEntry,
                clients,
                integrationId: latestTool.serverIntegrationId,
                retiredClients,
              });
              clientEntry = await getMcpClient({
                organizationId,
                integrationId: latestTool.serverIntegrationId,
                clients,
              });
            }
            return executeMcpTool({
              clientEntry,
              indexedTool: latestTool,
              input,
              options,
            });
          },
        });

        await touchMcpSessionToolActivation({
          organizationId,
          sessionId,
          surface,
          toolId: indexedTool.id,
        });

        return output;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isLikelySchemaOrUnknownToolError(message)) {
          await markMcpToolIndexRowStale({
            organizationId,
            toolId: indexedTool.id,
            errorMessage: message,
          });
          return {
            isError: true,
            message:
              "The MCP tool definition appears stale. Search and activate the tool again before retrying.",
          };
        }
        throw error;
      }
    },
    metadata: {
      notra: {
        type: "mcp",
        serverId: indexedTool.serverIntegrationId,
        serverName: indexedTool.serverName,
        serverUrl: indexedTool.serverUrl,
        logoLightUrl: indexedTool.serverLogoLightUrl,
        logoDarkUrl: indexedTool.serverLogoDarkUrl,
        toolName: indexedTool.serverToolName,
        runtimeToolName: indexedTool.runtimeToolName,
        actionPhrasePresent: indexedTool.actionPhrasePresent,
        actionPhrasePast: indexedTool.actionPhrasePast,
      },
    },
  });
}

async function getMcpClient({
  organizationId,
  integrationId,
  clients,
}: GetMcpClientParams) {
  const existing = clients.get(integrationId);
  if (existing) {
    return existing;
  }

  const promise = createMcpClientForIntegration({
    organizationId,
    integrationId,
  }).catch((error) => {
    clients.delete(integrationId);
    throw error;
  });
  clients.set(integrationId, promise);
  return promise;
}

async function createMcpClientForIntegration({
  organizationId,
  integrationId,
}: CreateMcpClientForIntegrationParams) {
  const integration = await db.query.mcpServerIntegrations.findFirst({
    where: and(
      eq(mcpServerIntegrations.id, integrationId),
      eq(mcpServerIntegrations.organizationId, organizationId),
      eq(mcpServerIntegrations.enabled, true),
      eq(mcpServerIntegrations.resourceType, "connection")
    ),
  });

  if (!integration) {
    throw new Error("MCP server integration is unavailable.");
  }

  await assertPublicHttpUrlResolution(integration.url);

  const requestAuth = await getMcpRequestAuth(integrationId, organizationId);
  return withMcpOAuthRetry({
    integrationId,
    organizationId,
    requestAuth,
    operation: async (nextAuth) => ({
      client: await connectMcpClient({
        integrationId,
        organizationId,
        requestAuth: nextAuth,
        url: integration.url,
      }),
      requestAuth: nextAuth,
    }),
  });
}

async function connectMcpClient({
  integrationId,
  organizationId,
  requestAuth,
  url,
}: ConnectMcpClientParams) {
  return createMCPClient({
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
      console.error("[Lazy MCP Client Error]", {
        integrationId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });
}

async function retireMcpClient({
  clientEntry,
  clients,
  integrationId,
  retiredClients,
}: RetireMcpClientParams) {
  const existing = clients.get(integrationId);
  if (!existing) {
    return;
  }
  const settled = await existing.catch(() => undefined);
  if (settled !== clientEntry) {
    return;
  }
  clients.delete(integrationId);
  retiredClients.add(existing);
}

async function executeMcpTool({
  clientEntry,
  indexedTool,
  input,
  options,
}: ExecuteMcpToolParams) {
  const definitions = {
    tools: [toMcpToolDefinition(indexedTool)],
  } as Awaited<ReturnType<MCPClient["listTools"]>>;
  const convertedTools = clientEntry.client.toolsFromDefinitions(definitions);
  const convertedTool = convertedTools[indexedTool.serverToolName];
  if (!convertedTool?.execute) {
    throw new Error(
      `MCP tool ${indexedTool.serverToolName} could not be prepared for execution.`
    );
  }

  return convertedTool.execute(input, {
    ...options,
    abortSignal: withExecutionTimeout(options),
  });
}

function toMcpToolDefinition(indexedTool: IndexedMcpTool): McpToolDefinition {
  return {
    name: indexedTool.serverToolName,
    title: indexedTool.title ?? undefined,
    description: indexedTool.description ?? undefined,
    inputSchema: toMcpDefinitionInputSchema(indexedTool.inputSchema),
    outputSchema:
      typeof indexedTool.outputSchema === "object" &&
      indexedTool.outputSchema !== null
        ? (indexedTool.outputSchema as Record<string, unknown>)
        : undefined,
    annotations:
      typeof indexedTool.annotations === "object" &&
      indexedTool.annotations !== null
        ? (indexedTool.annotations as McpToolDefinition["annotations"])
        : undefined,
    _meta:
      typeof indexedTool.meta === "object" && indexedTool.meta !== null
        ? (indexedTool.meta as McpToolDefinition["_meta"])
        : undefined,
  };
}

function toAiSdkInputJsonSchema(
  inputSchema: unknown
): Parameters<typeof jsonSchema>[0] {
  return toMcpDefinitionInputSchema(inputSchema) as Parameters<
    typeof jsonSchema
  >[0];
}

function toMcpDefinitionInputSchema(
  inputSchema: unknown
): McpToolDefinition["inputSchema"] {
  if (typeof inputSchema !== "object" || inputSchema === null) {
    return { type: "object" as const, properties: {} };
  }

  const schema = inputSchema as Record<string, unknown>;
  return {
    ...schema,
    type: "object" as const,
    properties:
      typeof schema.properties === "object" && schema.properties !== null
        ? (schema.properties as Record<string, unknown>)
        : {},
  } as McpToolDefinition["inputSchema"];
}

function withExecutionTimeout(options: ToolExecutionOptions<unknown>) {
  const timeoutSignal = AbortSignal.timeout(MCP_EXECUTION_TIMEOUT_MS);
  return options.abortSignal
    ? AbortSignal.any([options.abortSignal, timeoutSignal])
    : timeoutSignal;
}

function summarizeJsonSchema(schema: unknown) {
  if (typeof schema !== "object" || schema === null) {
    return "No input parameters.";
  }

  const properties = (schema as { properties?: unknown }).properties;
  if (typeof properties !== "object" || properties === null) {
    return "No input parameters.";
  }

  const names = Object.keys(properties);
  if (names.length === 0) {
    return "No input parameters.";
  }

  return `Input parameters: ${names.slice(0, 12).join(", ")}${names.length > 12 ? ", ..." : ""}`;
}

function shouldRequireApproval(annotations: unknown) {
  if (typeof annotations !== "object" || annotations === null) {
    return true;
  }
  return (annotations as { readOnlyHint?: unknown }).readOnlyHint !== true;
}

function isLikelySchemaOrUnknownToolError(message: string) {
  return MCP_STALE_TOOL_ERROR_REGEX.test(message);
}

function formatActiveToolDescriptions(tools: ActivatedMcpTool[]) {
  return tools.slice(0, MCP_SESSION_ACTIVE_TOOL_LIMIT).map((tool) => {
    const title = sanitizePromptText(tool.title ?? tool.runtimeToolName, 80);
    const description = sanitizePromptText(
      tool.description ?? `MCP tool from ${tool.serverName}`,
      220
    );
    return `**Active MCP Tool: ${tool.runtimeToolName}** (${title}): ${description}`;
  });
}

function sanitizePromptText(value: string, maxLength: number) {
  const normalized = value
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 3)}...`
    : normalized;
}
