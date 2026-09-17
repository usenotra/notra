import type { IconSvgElement } from "@hugeicons/react";

export type McpUseCaseCategoryId =
  | "strategy-research"
  | "content-creation"
  | "reporting-automation"
  | "analytics-monitoring";

export interface McpUseCaseCategory {
  id: McpUseCaseCategoryId;
  label: string;
  icon: IconSvgElement;
}

export interface McpUseCaseCategoryFilter {
  id: McpUseCaseCategoryId | "all";
  label: string;
  icon?: IconSvgElement;
}

export type McpUseCaseToolId =
  | "notra"
  | "claude"
  | "chatgpt"
  | "gemini"
  | "perplexity"
  | "google-search-console"
  | "slack"
  | "github"
  | "linear"
  | "linkedin"
  | "x";

interface McpUseCaseAuthor {
  name: string;
  url?: string;
}

export interface McpUseCase {
  slug: string;
  title: string;
  tagline: string;
  category: McpUseCaseCategoryId;
  /** Logos shown on the card and detail page, Notra first. */
  stack: McpUseCaseToolId[];
  /** The prompt a user pastes into their agent. */
  prompt: string;
  /** Notra MCP tool names the workflow calls, in call order. */
  tools: string[];
  /** Body paragraphs for "What this use case can do for you". */
  body: string[];
  author?: McpUseCaseAuthor;
}

export interface McpUseCaseCardProps {
  entry: McpUseCase;
}

export interface McpUseCaseStackProps {
  stack: McpUseCaseToolId[];
  size?: "sm" | "md";
  className?: string;
}

export interface McpUseCaseToolIconProps {
  toolId: McpUseCaseToolId;
  className?: string;
}

export interface McpUseCasesBrowserProps {
  useCases: McpUseCase[];
  categories: McpUseCaseCategoryFilter[];
}

export interface McpUseCasePromptBlockProps {
  entry: McpUseCase;
}

export interface McpUseCaseDetailViewProps {
  entry: McpUseCase;
  related: McpUseCase[];
}

export interface McpUseCaseDetailPageProps {
  params: Promise<{ slug: string }>;
}
