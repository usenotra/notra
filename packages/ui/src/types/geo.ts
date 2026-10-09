import type { Transition } from "motion/react";
import type { ReactNode } from "react";

export type GeoPresenceStatus =
  | "training-data"
  | "retrieval-only"
  | "invisible";

export interface GeoPresenceBadgeLabels {
  retrievalOnly: string;
  retrievalOnlyTitle: string;
  invisible: string;
  invisibleTitle: string;
}

export interface PresenceBadgeProps {
  status: GeoPresenceStatus | null;
  labels?: Partial<GeoPresenceBadgeLabels>;
}

export interface PurposeBadgeProps {
  category: string;
  label?: string;
  description?: string;
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
  | "instagram"
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

export interface GeoAnswerThreadLabels {
  mentionedWithoutExcerpt: string;
  notMentioned: string;
}

export interface GeoPromptAnswerThreadProps {
  prompt: string;
  result: GeoAnswerResult;
  timestamp: string;
  labels?: Partial<GeoAnswerThreadLabels>;
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
  labels?: Partial<PromptEngineSwitcherLabels>;
  /** Pill slide between engines; defaults to the flat indicator spring. */
  transition?: Transition;
  /**
   * Keeps every engine on one row on small screens: inactive pills show
   * only their icon there, the active one keeps its name.
   */
  compactOnMobile?: boolean;
}

export interface PromptEngineSwitcherLabels {
  engines: string;
  search: string;
  previousEngine: string;
  nextEngine: string;
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
  /**
   * Spells out the brand next to each visible logo. Bare logos only work where
   * the reader already knows the set (engines); for competitors they force a
   * hover just to learn who is in the row.
   */
  showLabel?: boolean;
  labels?: Partial<LogoStackLabels>;
}

export interface LogoStackLabels {
  none: string;
  additionalItems: string;
  showAdditionalItems: (count: number) => string;
}

export interface StatTile {
  key: string;
  label: string;
  value: string | number;
}

export interface StatTilesProps {
  tiles: StatTile[];
  className?: string;
  locale?: string;
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
  labels?: Partial<ConversationRowLabels>;
}

export interface ConversationRowLabels {
  turns: (count: number) => string;
  edit: string;
  pause: (name: string) => string;
  enable: (name: string) => string;
  includedInScans: string;
  pausedInScans: string;
  delete: string;
  deleteItem: (name: string) => string;
}

export interface CompetitorLogoProps {
  name: string;
  domain: string | null;
  className?: string;
  onSettled?: () => void;
}
