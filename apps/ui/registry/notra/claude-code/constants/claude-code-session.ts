import type {
  ClaudeCodeSession,
  ClaudeCodeSessionToolCall,
  ClaudeCodeTodo,
} from "../types/claude-code";

export const CLAUDE_CODE_SESSION: ClaudeCodeSession = {
  assistantMessage:
    "I'll pull the week from notra, draft it in your voice, then publish.",
  header: {
    cwd: "~/acme/web",
    model: "Fable 5 with xhigh effort · Claude Max",
    org: "dominik@usenotra.com's Organization",
    tips: [
      "Ask Claude to draft this week's changelog",
      "Shift+Tab cycles permission mode",
    ],
    user: "Dominik",
    version: "v2.1.206",
    whatsNew: [
      "MCP tool calls now stream progress",
      "Added a /doctor check that proposes trims",
    ],
  },
  promptPlaceholder: 'Try "draft a launch post for the new API"',
  resultMessage: "Published. Drafted in your voice from 14 PRs in 22 seconds.",
  thinking:
    "The user wants this week's merged PRs turned into a changelog and posted. I should list the events first, then draft in the brand voice, then publish.",
  title: "claude — ~/acme/web",
  todos: [
    { label: "Pull this week's merged PRs via notra", status: "done" },
    { label: "Draft the changelog in brand voice", status: "active" },
    { label: "Publish and schedule social updates", status: "todo" },
  ],
  toolCalls: [
    {
      arg: 'gh pr list --state merged --search "merged:>=2026-09-22"',
      detail:
        "#1315  feat(ui): add marketing button to the registry\n#1312  feat(ui): add Depth primary and secondary buttons\n#1311  fix(ui): share docs navbar between home and docs pages\n#1309  fix(onboarding): make setup controls and validation clearer\n#1308  fix(dashboard): prevent agent title descender clipping",
      id: "list-prs",
      result: "#1315  feat(ui): add marketing button to the registry",
      tool: "Bash",
    },
    {
      arg: 'range: "week"',
      id: "list-events",
      result: "14 merged PRs, 2 releases",
      tool: "notra - list_events (MCP)",
    },
    {
      arg: 'type: "changelog", tone: "brand"',
      id: "create-post",
      result: 'Draft created: "Scheduler v2, 40% faster builds"',
      tool: "notra - create_post (MCP)",
    },
    {
      arg: 'id: "post_2f9a"',
      id: "publish-post",
      result: "Published to acme.com/changelog",
      tool: "notra - publish_post (MCP)",
    },
  ],
  userMessage: "draft a changelog from this week's merged PRs and post it",
};

export const CLAUDE_CODE_TODO_STATES: ClaudeCodeTodo[] = [
  { label: "Read the brand voice from notra", status: "done" },
  { label: "Draft the LinkedIn post", status: "active" },
  { label: "Queue the X thread", status: "todo" },
];

export const CLAUDE_CODE_TOOL_STATES: ClaudeCodeSessionToolCall[] = [
  {
    arg: "week",
    id: "success",
    result: "14 merged PRs, 2 releases",
    status: "success",
    tool: "notra · list_events",
  },
  {
    arg: "changelog",
    id: "pending",
    result: "Drafting in brand voice…",
    status: "pending",
    tool: "notra · create_post",
  },
  {
    arg: "changelog",
    id: "error",
    result: "Publish failed · retry with /retry",
    status: "error",
    tool: "notra · publish_post",
  },
  {
    arg: "apps/web/src/constants/mcp.ts",
    detail:
      'export const MCP_TERMINAL_TITLE = "claude — ~/acme/web";\nexport const MCP_TERMINAL_USER_MESSAGE =\n  "draft a changelog from this week\'s merged PRs and post it";',
    id: "expandable",
    result: "Read 151 lines",
    status: "success",
    tool: "Read",
  },
];
