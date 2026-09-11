import type { ReactNode } from "react";

export type GeoPresenceStatus =
  | "training-data"
  | "retrieval-only"
  | "invisible";

export interface PresenceBadgeProps {
  status: GeoPresenceStatus | null;
}

export interface PurposeBadgeProps {
  category: string;
}

export interface PromptOutcomeIconProps {
  mentioned: boolean;
  className?: string;
}

export interface GeoBarProps {
  value: number;
  max?: number;
  className?: string;
  fillClassName?: string;
  fillColor?: string;
}

export type EngineIconKey =
  | "openai"
  | "claude"
  | "gemini"
  | "google"
  | "amazon"
  | "perplexity"
  | "mistral"
  | "deepseek"
  | "meta"
  | "grok"
  | "qwen"
  | "copilot"
  | "tencent"
  | "xiaomi"
  | "cursor"
  | "claude-code"
  | "codex"
  | "apple"
  | "duckduckgo"
  | "cloudflare"
  | "tiktok"
  | "mozilla"
  | "manus"
  | "firecrawl"
  | "cohere"
  | "opencode"
  | "kimi"
  | "zai"
  | "exa"
  | "commoncrawl"
  | "youcom"
  | "liner"
  | "cline"
  | "devin"
  | "diffbot"
  | "tavily"
  | "timpi"
  | "huawei"
  | "kagi"
  | "agent"
  | "cli";

export interface EngineIconRule {
  key: EngineIconKey;
  patterns: readonly string[];
  exact?: readonly string[];
}

export interface EngineIconProps {
  engine: string;
  className?: string;
}

export interface ModelProviderLogoProps {
  provider: string;
  className?: string;
}

export interface ParsedModelId {
  provider: string;
  slug: string;
}

export type GeoChatSkin =
  | "claude"
  | "chatgpt"
  | "gemini"
  | "perplexity"
  | "opencode"
  | "claude-code"
  | "codex";

export interface GeoAnswerResult {
  engine: string;
  excerpt: string;
  mentioned: boolean;
}

export interface GeoPromptAnswerThreadProps {
  prompt: string;
  result: GeoAnswerResult;
  timestamp: string;
}

export interface PromptEngineSwitcherItem {
  engine: string;
  family: string;
  label: string;
  showSearchIcon: boolean;
}

export interface PromptEngineSwitcherProps {
  items: PromptEngineSwitcherItem[];
  active: string;
  onChange: (engine: string, direction: number) => void;
}

export type GeoGapsMeterTone = "empty" | "low" | "mid" | "high";

export interface GapMeterProps {
  level: number;
  label: string;
}

export interface LogoStackItem {
  key: string;
  label: string;
  detail?: string | null;
  renderIcon: (className: string) => ReactNode;
}

export interface LogoStackProps {
  items: LogoStackItem[];
  limit?: number;
  emptyLabel?: string;
}

export interface StatTile {
  key: string;
  label: string;
  value: string | number;
}

export interface StatTilesProps {
  tiles: StatTile[];
  className?: string;
}

export interface ConversationRowProps {
  name: string;
  steps: readonly string[];
  enabled: boolean;
  pending?: boolean;
  onOpen?: () => void;
  onEdit?: () => void;
  onToggle?: (enabled: boolean) => void;
  onDelete?: () => void;
}

export interface CompetitorLogoProps {
  name: string;
  domain: string | null;
  className?: string;
  onSettled?: () => void;
}
