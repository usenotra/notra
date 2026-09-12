import type { AddMcpServerFormValues } from "@notra/schemas/dashboard/integrations";

export const MCP_AUTH_OPTIONS = [
  { label: "None", value: "none" },
  { label: "API key", value: "headers" },
  { label: "OAuth", value: "oauth" },
] as const;

export const DEFAULT_MCP_SERVER_FORM_VALUES: AddMcpServerFormValues = {
  authType: "none",
  name: "",
  url: "",
  description: "",
  headers: [{ name: "", value: "" }],
};

export const MCP_OAUTH_ERROR_MESSAGES: Record<string, string> = {
  mcp_oauth_denied: "MCP authorization was canceled.",
  mcp_oauth_failed: "MCP authorization failed. Try connecting again.",
  mcp_oauth_invalid_callback:
    "The MCP authorization link is invalid or expired.",
  mcp_oauth_refresh_token_required:
    "This server did not provide a refresh token, so it cannot stay connected.",
  mcp_oauth_session_required:
    "Sign in again before connecting this MCP server.",
};
