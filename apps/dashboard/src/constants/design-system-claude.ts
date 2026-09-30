import type {
  ClaudeCodeEffort,
  ClaudeCodeMode,
} from "@notra/ui/components/ai-skins/claude-code/claude-code-prompt";
import type { ClaudeCodeTodo } from "@notra/ui/components/ai-skins/claude-code/claude-code-todo-list";

import type {
  ClaudeStoryPromptVariant,
  ClaudeStorySession,
  ClaudeStoryToolCall,
} from "@/types/design-system-claude";

export const CLAUDE_STORY_MODES: ClaudeCodeMode[] = [
  "auto",
  "manual",
  "accept-edits",
  "plan",
  "bypass",
];

export const CLAUDE_STORY_EFFORTS: ClaudeCodeEffort[] = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultracode",
];

export const CLAUDE_STORY_SESSION: ClaudeStorySession = {
  title: "claude — ~/acme/web",
  header: {
    version: "v2.1.285",
    model: "Opus 5.5 (1M context)",
    org: "Claude Max",
    cwd: "~/acme/web",
    tips: [
      "SessionStart:startup hook succeeded",
      "notra MCP server connected · 24 tools",
    ],
    whatsNew: [
      "Get to finished work sooner with Opus 5.5. Switch anytime with `/model`.",
    ],
  },
  userMessage: "what changed since the last release?",
  commands: [
    {
      id: "git-log",
      tool: "Bash",
      arg: "git log --oneline v1.8.0..HEAD",
      result: "14 commits",
    },
  ],
  assistantMessage:
    "Since **v1.8.0** there are 14 merged PRs on `main`.\n\n`apps/dashboard` got the new **GEO scan** view, `packages/api` added `POST /v1/posts/:id/schedule`, and `apps/web` moved the changelog to `/changelog/[slug]`.\n\nWant me to draft the changelog for v1.9 from these?",
  summary: { verb: "Cogitated", duration: "7s", doneAt: "9:41 AM" },
  followUpMessage: "draft the changelog for v1.9 and queue it in notra",
  todos: [
    { label: "Group the 14 merged PRs by area", status: "done" },
    { label: "Draft the changelog in brand voice", status: "active" },
    { label: "Queue the post in notra", status: "todo" },
  ],
  pendingToolCall: {
    id: "brand-voice",
    tool: "Checking brand voice and the last changelogs",
    result: "$ notra brand voice --json && notra posts list --type changelog",
    status: "pending",
  },
  spinner: {
    verb: "Sketching",
    elapsed: "14s",
    tokens: 688,
    details: ["thinking"],
    tip: "Tip: Run `/resume` to pick up an earlier conversation",
  },
  promptPlaceholder: 'Try "write a LinkedIn post about the release"',
  pullRequestNumber: 1317,
};

export const CLAUDE_STORY_TODO_STATES: ClaudeCodeTodo[] = [
  { label: "Read the brand voice from notra", status: "done" },
  { label: "Draft the LinkedIn post", status: "active" },
  { label: "Queue the X thread", status: "todo" },
];

export const CLAUDE_STORY_TOOL_STATUSES: ClaudeStoryToolCall[] = [
  {
    id: "success",
    tool: "notra - list_events (MCP)",
    arg: 'range: "week"',
    result: "14 merged PRs, 2 releases",
    status: "success",
  },
  {
    id: "pending",
    tool: "Drafting the changelog in notra",
    result: "$ notra posts create --type changelog --from-prs v1.8.0..HEAD",
    status: "pending",
  },
  {
    id: "error",
    tool: "notra - publish_post (MCP)",
    arg: 'type: "changelog"',
    result: "Error: post is still in review",
    status: "error",
  },
  {
    id: "expandable",
    tool: "Read",
    arg: "apps/web/src/constants/mcp.ts",
    result: "Read 151 lines",
    status: "success",
    detail:
      'export const MCP_TERMINAL_TITLE = "claude — ~/acme/web";\nexport const MCP_TERMINAL_USER_MESSAGE =\n  "draft a changelog from this week\'s merged PRs and post it";',
  },
];

export const CLAUDE_STORY_PROMPT_MODES: ClaudeStoryPromptVariant[] =
  CLAUDE_STORY_MODES.map((mode) => ({
    id: `mode-${mode}`,
    mode,
    effort: false,
  }));

export const CLAUDE_STORY_PROMPT_EFFORTS: ClaudeStoryPromptVariant[] =
  CLAUDE_STORY_EFFORTS.map((effort) => ({
    id: `effort-${effort}`,
    mode: "auto",
    effort,
  }));
