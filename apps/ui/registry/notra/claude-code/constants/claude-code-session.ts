import type { ClaudeCodeReply, ClaudeCodeSession } from "../types/claude-code";

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
    {
      answer:
        "Drafted **v1.9** in your brand voice and queued it in Notra for Thursday 9:00 AM. The post groups the 14 PRs into features and fixes and links each one.\n\nOpen it with `notra posts open changelog-v1-9` to review before it goes out.",
      commands: [
        {
          arg: "type: changelog, voice: acme",
          id: "brand-voice",
          result: "Loaded brand voice and the last 3 changelogs",
          tool: "notra - get_brand_voice (MCP)",
        },
        {
          arg: "title: v1.9, schedule: thu 09:00",
          id: "queue-post",
          result: "Queued changelog-v1-9",
          tool: "notra - create_post (MCP)",
        },
      ],
      id: "draft-changelog",
      prompt: "draft the changelog for v1.9 and queue it in notra",
      summary: { doneAt: "9:43 AM", duration: "38s", verb: "Brewed" },
      todos: [
        { label: "Group the 14 merged PRs by area", status: "done" },
        { label: "Draft the changelog in brand voice", status: "done" },
        { label: "Queue the post in notra", status: "done" },
      ],
    },
  ],
};

/** Answers the demo plays back, one per prompt you send, in order. */
export const CLAUDE_CODE_REPLIES: ClaudeCodeReply[] = [
  {
    answer:
      "Here's a LinkedIn post for the release:\n\n**Acme v1.9 is out.** Track which AI engines cite you with the new GEO scan view, schedule posts straight from the API, and find every release at `/changelog`.\n\nSaved it as a draft next to the changelog. Want a shorter version for X?",
    commands: [
      {
        arg: "id: changelog-v1-9",
        id: "get-post",
        result: "Read changelog-v1-9 (412 words)",
        tool: "notra - get_post (MCP)",
      },
      {
        arg: "type: linkedin, source: changelog-v1-9",
        id: "create-linkedin",
        result: "Created linkedin-v1-9 as a draft",
        tool: "notra - create_post (MCP)",
      },
    ],
    spinnerVerb: "Crafting",
    summaryVerb: "Crafted",
  },
  {
    answer:
      "The scheduler fix is in `packages/api/src/jobs/publish.ts`. Failed publish jobs now retry three times with backoff before they surface in the dashboard.\n\nThe tests in `publish.test.ts` cover both the retry and the final failure.",
    commands: [
      {
        arg: 'pattern: "retry", path: packages/api',
        id: "grep-retry",
        result: "Found 4 files",
        tool: "Search",
      },
      {
        arg: "packages/api/src/jobs/publish.ts",
        id: "read-publish",
        result: "Read 86 lines",
        tool: "Read",
      },
    ],
    spinnerVerb: "Spelunking",
    summaryVerb: "Worked",
  },
  {
    answer:
      "All 212 tests pass and the build is clean. Nothing else is blocking **v1.9**.",
    commands: [
      {
        arg: "bun run test",
        id: "run-tests",
        result: "212 passed",
        tool: "Bash",
      },
    ],
    spinnerVerb: "Verifying",
    summaryVerb: "Cogitated",
  },
];
