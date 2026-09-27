import type { ChatContextSuggestedIntegration } from "@/types/components/chat-input";

export const CHAT_CONTEXT_SUGGESTED_INTEGRATIONS: readonly ChatContextSuggestedIntegration[] =
  [
    {
      id: "github",
      name: "GitHub",
      href: "github",
      keywords: ["github", "repo", "repository", "context"],
    },
    {
      id: "linear",
      name: "Linear",
      href: "linear",
      keywords: ["linear", "issues", "team", "context"],
    },
    {
      id: "mcp",
      name: "MCP",
      href: "mcp",
      keywords: ["mcp", "tools", "server", "custom"],
    },
  ];
