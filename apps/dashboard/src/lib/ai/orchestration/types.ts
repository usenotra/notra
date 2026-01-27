export interface ValidatedIntegration {
  id: string;
  type: "github";
  enabled: boolean;
  displayName: string;
  organizationId: string;
  repositories: Array<{
    id: string;
    owner: string;
    repo: string;
    enabled: boolean;
  }>;
}

export interface EnabledCapabilities {
  github: boolean;
  skills: boolean;
  markdown: boolean;
}

export interface TextSelection {
  text: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
}

export interface ContextItem {
  type: "github-repo";
  owner: string;
  repo: string;
  integrationId: string;
}

export interface RoutingDecision {
  complexity: "simple" | "complex";
  requiresTools: boolean;
  reasoning: string;
}

export interface RoutingResult {
  model: string;
  complexity: "simple" | "complex";
  requiresTools: boolean;
  reasoning: string;
}

export interface ToolSet {
  tools: Record<string, import("ai").Tool>;
  descriptions: string[];
}

export interface RepoContext {
  owner: string;
  repo: string;
}
