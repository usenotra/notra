import type { MCPClient } from "@ai-sdk/mcp";
import type { PrepareStepFunction, Tool, ToolExecutionOptions } from "ai";

import type { McpRequestAuth } from "./mcp-oauth";
import type { IndexedMcpTool, McpSessionSurface } from "./mcp-tool-index";

export interface McpClientEntry {
  client: MCPClient;
  requestAuth: McpRequestAuth;
}

export type McpClientRegistry = Map<string, Promise<McpClientEntry>>;
export type RetiredMcpClients = Set<Promise<McpClientEntry>>;

export interface LazyMcpRuntimeParams {
  organizationId: string;
  sessionId: string;
  surface: McpSessionSurface;
  baseActiveToolNames: string[];
  tools?: Record<string, Tool>;
  maxRuntimeTools?: number;
  serverIntegrationIds?: string[];
}

export interface LazyMcpRuntime {
  tools: Record<string, Tool>;
  initialActiveTools: string[];
  prepareStep: PrepareStepFunction<Record<string, Tool>>;
  requiresApproval: (toolName: string) => boolean;
  descriptions: string[];
  cleanup: () => Promise<void>;
}

export interface CreateRuntimeMcpToolParams {
  organizationId: string;
  sessionId: string;
  surface: McpSessionSurface;
  indexedTool: IndexedMcpTool;
  clients: McpClientRegistry;
  retiredClients: RetiredMcpClients;
}

export interface GetMcpClientParams {
  organizationId: string;
  integrationId: string;
  clients: McpClientRegistry;
}

export interface CreateMcpClientForIntegrationParams {
  organizationId: string;
  integrationId: string;
}

export interface ConnectMcpClientParams {
  integrationId: string;
  organizationId: string;
  requestAuth: McpRequestAuth;
  url: string;
}

export interface RetireMcpClientParams {
  clientEntry: McpClientEntry;
  clients: McpClientRegistry;
  integrationId: string;
  retiredClients: RetiredMcpClients;
}

export interface ExecuteMcpToolParams {
  clientEntry: McpClientEntry;
  indexedTool: IndexedMcpTool;
  input: unknown;
  options: ToolExecutionOptions<unknown>;
}
