import type { McpJsonRpcToolsListResponse, McpToolCard } from "@/types/mcp";
import { MCP_URL } from "@/utils/urls";

const MCP_PROTOCOL_VERSION = "2025-06-18";
const MCP_FETCH_TIMEOUT_MS = 15_000;

function parseJsonRpcBody(body: string, contentType: string): unknown {
  if (contentType.includes("text/event-stream")) {
    const dataLines = body
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => line.slice("data: ".length));
    const lastLine = dataLines.at(-1);
    return lastLine ? JSON.parse(lastLine) : null;
  }
  return JSON.parse(body);
}

async function postJsonRpc(
  apiKey: string,
  sessionId: string | null,
  payload: Record<string, unknown>
): Promise<{ body: unknown; sessionId: string | null }> {
  const response = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(MCP_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`MCP request failed with status ${response.status}`);
  }
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  return {
    body: text ? parseJsonRpcBody(text, contentType) : null,
    sessionId: response.headers.get("mcp-session-id") ?? sessionId,
  };
}

function isToolsListResponse(
  value: unknown
): value is McpJsonRpcToolsListResponse {
  return typeof value === "object" && value !== null && "result" in value;
}

export async function fetchMcpTools(): Promise<McpToolCard[] | null> {
  const apiKey = process.env.NOTRA_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const init = await postJsonRpc(apiKey, null, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "notra-web-build", version: "1.0.0" },
      },
    });

    await postJsonRpc(apiKey, init.sessionId, {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });

    const list = await postJsonRpc(apiKey, init.sessionId, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });

    if (!isToolsListResponse(list.body)) {
      return null;
    }

    const tools: McpToolCard[] = [];
    for (const tool of list.body.result?.tools ?? []) {
      if (typeof tool.name === "string" && tool.name.length > 0) {
        tools.push({ name: tool.name, description: tool.description ?? "" });
      }
    }

    return tools.length > 0 ? tools : null;
  } catch {
    return null;
  }
}
