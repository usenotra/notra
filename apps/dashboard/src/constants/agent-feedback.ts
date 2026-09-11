import {
  Bug01Icon,
  HelpCircleIcon,
  MoreHorizontalCircle01Icon,
  NeutralIcon,
  Sad01Icon,
  SmileIcon,
  SparklesIcon,
  ThumbsUpIcon,
} from "@hugeicons/core-free-icons";
import type {
  AgentFeedbackKind,
  AgentFeedbackSentiment,
  AgentFeedbackStatus,
} from "@notra/db/types/agent-feedback";

import type {
  AgentFeedbackClientBrandRule,
  AgentFeedbackSnippetKey,
  AgentFeedbackStatusFilter,
} from "@/types/agent-feedback";

export const AGENT_FEEDBACK_NAV_LINK = "/feedback";
export const AGENT_FEEDBACK_DOCS_URL =
  "https://docs.usenotra.com/api/agent-feedback";
export const AGENT_FEEDBACK_API_BASE_URL = "https://api.usenotra.com";
export const AGENT_FEEDBACK_API_PATH = "/v1/feedback";
export const AGENT_FEEDBACK_API_URL_ENV = "FEEDBACK_API_URL";
export const AGENT_FEEDBACK_PACKAGE = "@usenotra/geo";
export const AGENT_FEEDBACK_PACKAGE_ENTRY = `${AGENT_FEEDBACK_PACKAGE}/feedback`;
export const AGENT_FEEDBACK_STATUS_FILTERS: {
  value: AgentFeedbackStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "triaged", label: "Triaged" },
  { value: "resolved", label: "Resolved" },
  { value: "archived", label: "Archived" },
];

export const AGENT_FEEDBACK_STATUS_LABELS: Record<AgentFeedbackStatus, string> =
  {
    new: "New",
    triaged: "Triaged",
    resolved: "Resolved",
    archived: "Archived",
  };

export const AGENT_FEEDBACK_KIND_LABELS: Record<AgentFeedbackKind, string> = {
  bug: "Bug",
  feature: "Feature",
  praise: "Praise",
  question: "Question",
  other: "Other",
};

export const AGENT_FEEDBACK_KIND_ICONS: Record<
  AgentFeedbackKind,
  typeof Bug01Icon
> = {
  bug: Bug01Icon,
  feature: SparklesIcon,
  praise: ThumbsUpIcon,
  question: HelpCircleIcon,
  other: MoreHorizontalCircle01Icon,
};

export const AGENT_FEEDBACK_SENTIMENT_LABELS: Record<
  AgentFeedbackSentiment,
  string
> = {
  negative: "Negative",
  neutral: "Neutral",
  positive: "Positive",
};

export const AGENT_FEEDBACK_SENTIMENT_ICONS: Record<
  AgentFeedbackSentiment,
  typeof Sad01Icon
> = {
  negative: Sad01Icon,
  neutral: NeutralIcon,
  positive: SmileIcon,
};

export const AGENT_FEEDBACK_DEFAULT_SNIPPET_TAB: AgentFeedbackSnippetKey =
  "mcp";

export const AGENT_FEEDBACK_SNIPPET_TABS: {
  value: AgentFeedbackSnippetKey;
  label: string;
  filename: string;
}[] = [
  { value: "mcp", label: "SDK", filename: "server.ts" },
  { value: "fetch", label: "No SDK", filename: "server.ts" },
  { value: "curl", label: "curl", filename: "terminal" },
];

export const AGENT_FEEDBACK_SNIPPET_FILENAMES: Record<
  AgentFeedbackSnippetKey,
  string
> = {
  mcp: "server.ts",
  fetch: "server.ts",
  curl: "terminal",
};

export const AGENT_FEEDBACK_UNSPECIFIED_LABEL = "Unspecified";

export const AGENT_FEEDBACK_STATUS_ICON_CLASS: Record<
  AgentFeedbackStatus,
  string
> = {
  new: "text-info",
  triaged: "text-warning",
  resolved: "text-success",
  archived: "text-muted-foreground",
};

export const AGENT_FEEDBACK_LABEL_PILL_CLASS =
  "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-xs font-medium";

export const AGENT_FEEDBACK_KIND_PILL_CLASS: Record<AgentFeedbackKind, string> =
  {
    bug: "border-destructive/25 bg-destructive/10 text-foreground",
    feature: "border-info/25 bg-info/10 text-foreground",
    praise: "border-success/25 bg-success/10 text-foreground",
    question: "border-warning/25 bg-warning/10 text-foreground",
    other: "border-border bg-muted/50 text-muted-foreground dark:bg-muted/30",
  };

export const AGENT_FEEDBACK_SENTIMENT_PILL_CLASS: Record<
  AgentFeedbackSentiment,
  string
> = {
  negative: "border-destructive/25 bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted/50 text-muted-foreground dark:bg-muted/30",
  positive: "border-success/25 bg-success/10 text-success",
};

export const AGENT_FEEDBACK_CLIENT_BRAND_RULES: readonly AgentFeedbackClientBrandRule[] =
  [
    { brand: "claude", aliases: ["claude", "anthropic"] },
    { brand: "cursor", aliases: ["cursor"] },
    { brand: "openai", aliases: ["openai", "chatgpt"] },
    { brand: "vercel", aliases: ["vercel"] },
    { brand: "windsurf", aliases: ["windsurf", "cascade"] },
    { brand: "amp", aliases: ["amp", "sourcegraph"] },
    { brand: "playwright", aliases: ["playwright"] },
    { brand: "notra", aliases: ["notra"] },
    { brand: "cline", aliases: ["cline"] },
    { brand: "devin", aliases: ["devin"] },
    { brand: "copilot", aliases: ["copilot"] },
    { brand: "gemini", aliases: ["gemini"] },
  ];
