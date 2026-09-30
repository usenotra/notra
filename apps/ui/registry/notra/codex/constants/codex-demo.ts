import type { CodexDemoExec, CodexDemoSession } from "../types/codex";

export const CODEX_DEMO_SESSION: CodexDemoSession = {
  composer: {
    effort: "low",
    model: "gpt-6.1-codex",
    placeholder: "Ask Codex to do anything",
    task: "Draft changelog",
    warnings: 2,
  },
  exec: {
    command:
      "git log --oneline --since='1 week' | rg -i 'feat|fix' && cat CHANGELOG.md",
    output: [
      "a41c9e2 feat(geo): track citations per model",
      "7d02b18 fix(scheduler): retry failed publish jobs",
      "c9e5f11 feat(studio): brand voice presets",
      "4be0a7d fix(api): paginate /v1/posts past 100 items",
      "91f3c20 fix(geo): dedupe prompts across projects",
      "e03d6b4 feat(api): add /v1/citations endpoint",
      "2c7a9f8 fix(ui): focus ring on the composer",
      "## 2026-09-23",
      "- Scheduler v2 with 40% faster builds",
    ].join("\n"),
  },
  explored: [
    {
      id: "search-changelog",
      scope: "CHANGELOG.md",
      target: "changelog|release",
      verb: "Search",
    },
    { id: "read-package", target: "package.json", verb: "Read" },
  ],
  exploredDetails: [
    { id: "list-apps", target: "apps", verb: "List" },
    { id: "read-readme", target: "apps/dashboard/README.md", verb: "Read" },
  ],
  followUp: "Want me to publish it to acme.com/changelog?",
  header: {
    cwd: "~/acme/web",
    version: "0.159.2",
  },
  highlights: [
    {
      id: "citations",
      label: "GEO citations:",
      text: "See which sources each AI model cites for your tracked prompts.",
    },
    {
      id: "voice",
      label: "Brand voice presets:",
      text: "Save a voice once and reuse it for every changelog and post.",
    },
    {
      id: "scheduler",
      label: "Scheduler:",
      text: "Failed publish jobs now retry on their own.",
    },
  ],
  intro:
    "I'll check this week's merged commits and the current changelog, then draft the new entry.",
  reasoning: "Grouping commits into features and fixes",
  summary: "This week shipped 3 features and 4 fixes. Here is the draft:",
  table: {
    headers: ["Folder", "Change"],
    rows: [
      ["apps/dashboard", "Citations view on the GEO page"],
      ["packages/geo-core", "Citation tracking per model"],
      ["apps/api", "New /v1/citations endpoint"],
      ["packages/ui", "Brand voice picker"],
    ],
  },
  tableIntro: "The changes touch these parts of the repo:",
  title: "codex — ~/acme/web",
  userMessage: "what shipped this week? draft the changelog",
};

export const CODEX_DEMO_EXEC_STATES: CodexDemoExec[] = [
  {
    command: "notra list_events --range week --json | jq '.[].title'",
    id: "ran",
    output: [
      '"Scheduler v2"',
      '"GEO citations"',
      '"Brand voice presets"',
      '"Paginate /v1/posts"',
      '"Dedupe prompts"',
    ].join("\n"),
    status: "ran",
  },
  {
    command: "notra create_post --type changelog --voice 'acme'",
    id: "running",
    status: "running",
  },
  {
    command: "notra publish_post changelog",
    id: "failed",
    output: "error: missing NOTRA_API_KEY",
    status: "failed",
  },
];
