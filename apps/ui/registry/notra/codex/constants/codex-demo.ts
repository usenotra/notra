import type { CodexDemoExec, CodexDemoSession } from "../types/codex";

export const CODEX_DEMO_SESSION: CodexDemoSession = {
  assistantMessage:
    "I'll list the week's events, draft the changelog in brand voice, then publish.",
  context: "88% context left",
  execs: [
    {
      command: "notra list_events --range week",
      id: "list-events",
      output: "14 merged PRs, 2 releases",
      status: "ran",
    },
    {
      command: "notra create_post --type changelog",
      id: "create-post",
      output: '"Scheduler v2, 40% faster builds"',
      status: "ran",
    },
    {
      command: "notra publish_post changelog",
      id: "publish-post",
      output: "live at acme.com/changelog",
      status: "ran",
    },
  ],
  header: {
    cwd: "~/acme/web",
    model: "gpt-5.4-codex",
    version: "0.92.0",
  },
  promptPlaceholder: "Ask Codex to do anything",
  reasoning:
    "Listing this week's merged PRs first, then drafting the changelog in the brand voice and publishing it.",
  resultMessage: "Published. Drafted in your voice from 14 PRs in 22 seconds.",
  title: "codex — ~/acme/web",
  userMessage: "draft a changelog from this week's merged PRs and post it",
};

export const CODEX_DEMO_EXEC_STATES: CodexDemoExec[] = [
  {
    command: "notra list_events --range week",
    id: "ran",
    output: "14 merged PRs, 2 releases",
    status: "ran",
  },
  {
    command: "notra create_post --type changelog",
    id: "running",
    output: "Drafting in brand voice…",
    status: "running",
  },
  {
    command: "notra publish_post changelog",
    id: "failed",
    output: "Publish failed · retry with /retry",
    status: "failed",
  },
];
