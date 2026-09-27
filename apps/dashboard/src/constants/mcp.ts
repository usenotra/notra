import type { AddMcpServerFormValues } from "@notra/schemas/dashboard/integrations";

export const MCP_AUTH_OPTIONS = [
  { labelKey: "none", value: "none" },
  { labelKey: "apiKey", value: "headers" },
  { labelKey: "oauth", value: "oauth" },
] as const;

export const DEFAULT_MCP_SERVER_FORM_VALUES: AddMcpServerFormValues = {
  authType: "none",
  name: "",
  url: "",
  description: "",
  headers: [{ name: "", value: "" }],
};

export const MCP_OAUTH_ERROR_CODES = [
  "mcp_oauth_denied",
  "mcp_oauth_failed",
  "mcp_oauth_invalid_callback",
  "mcp_oauth_refresh_token_required",
  "mcp_oauth_session_required",
] as const;
