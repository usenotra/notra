export interface McpClient {
  id: "claude-code" | "codex" | "cursor" | "hermes" | "openclaw" | "other";
  label: string;
  iconSrc?: string;
  invertInDark: boolean;
  command: string;
}

export interface McpToolCard {
  name: string;
  description: string;
}

export interface McpTerminalToolCall {
  tool: string;
  arg: string;
  result: string;
}

export interface McpCommandTabsProps {
  className?: string;
}

export interface McpHeroProps {
  subhead: string;
}

export interface McpTerminalDemoProps {
  toolCount: number;
}

export interface McpToolsGridProps {
  tools: McpToolCard[];
}

export interface McpJsonRpcToolsListResponse {
  result?: {
    tools?: {
      name?: string;
      description?: string;
    }[];
  };
}
