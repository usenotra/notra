export type LandingPreview =
  | "ai-overview"
  | "button"
  | "chat-minimap"
  | "chatgpt"
  | "claude"
  | "claude-code"
  | "codex"
  | "duotone-tooltip"
  | "gemini"
  | "marketing-button"
  | "opencode"
  | "perplexity"
  | "shimmer"
  | "tooltip";

export interface LandingComponentLink {
  description: string;
  href: string;
  preview?: LandingPreview;
  title: string;
}

export interface LandingSection {
  description: string;
  items: LandingComponentLink[];
  title: string;
}

export interface LandingInstallCommand {
  items: string[];
  prefix: string;
}

export interface LandingHero {
  description: string;
  install: LandingInstallCommand;
}
