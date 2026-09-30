import type { ClaudeCodeSession } from "../types/claude-code";

export const CLAUDE_CODE_SESSION: ClaudeCodeSession = {
  header: {
    cwd: "~/acme/web",
    model: "Opus 5.5 (1M context)",
    org: "Claude Max",
    tips: [
      "SessionStart:startup hook succeeded",
      "notra MCP server connected · 24 tools",
    ],
    version: "v2.1.285",
    whatsNew: [
      "Get to finished work sooner with Opus 5.5. Switch anytime with `/model`.",
    ],
  },
  pending: {
    prompt: "draft the changelog for v1.9 and queue it in notra",
    spinner: {
      details: ["thinking"],
      elapsed: "14s",
      tip: "Tip: Run `/resume` to pick up an earlier conversation",
      tokens: 688,
      verb: "Sketching",
    },
    todos: [
      { label: "Group the 14 merged PRs by area", status: "done" },
      { label: "Draft the changelog in brand voice", status: "active" },
      { label: "Queue the post in notra", status: "todo" },
    ],
    toolCall: {
      id: "brand-voice",
      result:
        "$ notra brand voice --json && notra posts list --type changelog --limit 3",
      status: "pending",
      tool: "Checking brand voice and the last changelogs",
    },
  },
  promptPlaceholder: 'Try "write a LinkedIn post about the release"',
  pullRequest: { number: 1317 },
  title: "claude — ~/acme/web",
  turns: [
    {
      answer:
        "Since **v1.8.0** there are 14 merged PRs on `main`, split across three areas.\n\n`apps/dashboard` got the new **GEO scan** view with per-engine citations, `packages/api` added `POST /v1/posts/:id/schedule`, and `apps/web` moved the changelog to `/changelog/[slug]`. Two PRs are fixes from review.\n\nWant me to draft the changelog for v1.9 from these?",
      commands: [
        {
          arg: "git log --oneline v1.8.0..HEAD",
          id: "git-log",
          result: "14 commits",
          tool: "Bash",
        },
      ],
      id: "what-changed",
      prompt: "what changed since the last release?",
      summary: { doneAt: "9:41 AM", duration: "7s", verb: "Cogitated" },
    },
  ],
};
