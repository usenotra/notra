import type {
  CodexStoryExec,
  CodexStorySession,
} from "@/types/design-system-codex";

export const CODEX_STORY_SESSION: CodexStorySession = {
  header: { version: "0.159.2", cwd: "~/acme/web" },
  userMessage: "what shipped this week? draft the changelog",
  intro:
    "I'll check the merged commits and the current changelog, then draft this week's entry.",
  exec: {
    id: "git-log",
    command: "git log --oneline --since='1 week' | rg -i 'feat|fix'",
    output: [
      "a41c9e2 feat(geo): track citations per model",
      "7d02b18 fix(scheduler): retry failed publish jobs",
      "c9e5f11 feat(studio): brand voice presets",
    ].join("\n"),
    status: "ran",
    moreLines: 11,
  },
  explored: [
    {
      id: "search-changelog",
      verb: "Search",
      target: "changelog|release",
      scope: "CHANGELOG.md",
    },
    { id: "read-package", verb: "Read", target: "package.json" },
  ],
  elapsed: "13s",
  summary: "This week shipped 3 features and 11 fixes. Here is the draft:",
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
      text: "Failed publish jobs now retry automatically.",
    },
  ],
  tableIntro: "The changes touch these parts of the repo:",
  table: {
    headers: ["Folder", "Change"],
    rows: [
      ["apps/dashboard", "Citations view on the GEO page"],
      ["packages/geo-core", "Citation tracking per model"],
      ["apps/api", "New /v1/citations endpoint"],
      ["packages/ui", "Brand voice picker"],
    ],
  },
  followUp: "Want me to publish it to acme.com/changelog?",
  composer: {
    model: "gpt-6.1-codex",
    effort: "low",
    task: "Draft changelog",
    warnings: 2,
    placeholder: "Ask Codex to do anything",
  },
};

export const CODEX_STORY_EXECS: CodexStoryExec[] = [
  {
    id: "ran",
    command: "notra list_events --range week --json | jq '.[].title'",
    output: '"Scheduler v2"\n"GEO citations"\n"Brand voice presets"',
    status: "ran",
    moreLines: 11,
  },
  {
    id: "running",
    command: "notra create_post --type changelog --voice 'acme'",
    status: "running",
  },
  {
    id: "failed",
    command: "notra publish_post changelog",
    output: "error: missing NOTRA_API_KEY",
    status: "failed",
  },
];
