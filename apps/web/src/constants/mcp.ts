import type { ClaudeCodeTodo } from "@notra/ui/components/ai-skins/claude-code/claude-code-todo-list";

import type { McpClient, McpTerminalToolCall, McpToolCard } from "@/types/mcp";
import { MCP_URL } from "@/utils/urls";

export const MCP_CLIENTS: McpClient[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    iconSrc: "/mcp/claude-code.svg",
    invertInDark: false,
    command: `claude mcp add --transport http notra ${MCP_URL}`,
  },
  {
    id: "codex",
    label: "Codex",
    iconSrc: "/mcp/codex.svg",
    invertInDark: true,
    command: `codex mcp add notra -- npx -y mcp-remote ${MCP_URL}`,
  },
  {
    id: "cursor",
    label: "Cursor",
    iconSrc: "/mcp/cursor.svg",
    invertInDark: true,
    command: `npx add-mcp ${MCP_URL}`,
  },
  {
    id: "hermes",
    label: "Hermes",
    iconSrc: "/mcp/hermes.svg",
    invertInDark: true,
    command: `hermes mcp add notra --url ${MCP_URL}`,
  },
  {
    id: "openclaw",
    label: "OpenClaw",
    iconSrc: "/mcp/openclaw.svg",
    invertInDark: false,
    command: `mcporter config add notra ${MCP_URL}`,
  },
  {
    id: "other",
    label: "Other",
    invertInDark: false,
    command: `npx add-mcp ${MCP_URL}`,
  },
];

export const MCP_VISIBLE_TOOL_COUNT = 5;

export const MCP_FALLBACK_TOOL_CARDS: McpToolCard[] = [
  {
    name: "list_events",
    description: "Everything your team shipped this week, in one call.",
  },
  {
    name: "create_post",
    description: "Draft changelogs, launch posts and social updates.",
  },
  {
    name: "publish_post",
    description: "Ship the result to your changelog, blog, X or LinkedIn.",
  },
  {
    name: "schedule_post",
    description: "Queue content on a cadence your audience can trust.",
  },
  {
    name: "get_brand_voice",
    description: "Your tone, cadence and vocabulary as context.",
  },
  {
    name: "list_posts",
    description: "Browse every draft and published post in your workspace.",
  },
  {
    name: "update_post",
    description: "Revise drafts in place, straight from your agent.",
  },
  {
    name: "list_schedules",
    description: "See everything queued and when it goes out.",
  },
  {
    name: "create_schedule",
    description: "Set a cadence once and let the queue fill itself.",
  },
  {
    name: "list_integrations",
    description: "Check which sources feed your shipped-work timeline.",
  },
  {
    name: "update_brand_voice",
    description: "Teach Notra new vocabulary as your brand evolves.",
  },
  {
    name: "create_skill",
    description: "Save a reusable workflow your agent can run again.",
  },
];

export const MCP_TERMINAL_TITLE = "claude — ~/acme/web";

export const MCP_TERMINAL_HEADER = {
  version: "v2.1.285",
  model: "Opus 5.5 (1M context)",
  org: "Claude Max",
  cwd: "~/acme/web",
};

export const MCP_TERMINAL_WHATS_NEW_STATIC =
  "MCP tool calls now stream progress. Run `/mcp` to manage servers.";

export const MCP_TERMINAL_USER_MESSAGE =
  "draft a changelog from this week's merged PRs and post it";

export const MCP_TERMINAL_ASSISTANT_MESSAGE =
  "I'll pull the week from **notra**, draft it in your voice, then publish.";

export const MCP_TERMINAL_TODOS: ClaudeCodeTodo[] = [
  { label: "Pull this week's merged PRs via notra", status: "done" },
  { label: "Draft the changelog in brand voice", status: "active" },
  { label: "Publish and schedule social updates", status: "todo" },
];

export const MCP_TERMINAL_TOOL_CALLS: McpTerminalToolCall[] = [
  {
    tool: "notra - list_events (MCP)",
    arg: 'range: "week"',
    result: "14 merged PRs, 2 releases",
  },
  {
    tool: "notra - create_post (MCP)",
    arg: 'type: "changelog"',
    result: '"Scheduler v2, 40% faster builds"',
  },
  {
    tool: "notra - publish_post (MCP)",
    arg: 'type: "changelog"',
    result: "live at acme.com/changelog",
  },
];

export const MCP_TERMINAL_RESULT_MESSAGE =
  "Published. Drafted in your voice from **14** PRs and live at `acme.com/changelog`.";

export const MCP_TERMINAL_TURN_SUMMARY = {
  verb: "Worked",
  duration: "22s",
  doneAt: "9:41 AM",
};

export const MCP_TERMINAL_PROMPT_PLACEHOLDER =
  'Try "draft a launch post for the new API"';
