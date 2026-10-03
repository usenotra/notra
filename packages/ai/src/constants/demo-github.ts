/**
 * The fictional Fieldnote repository the public demo's content agents read.
 * Offsets are days before "now", so the last week always has activity.
 */
export const DEMO_GITHUB_DISABLED_MESSAGE =
  "GitHub writes are off in the demo. Start free to connect your own repositories.";

export const DEMO_GITHUB_COMMITS = [
  {
    sha: "9f1c2a7e4b1d8c3f6a2e5b7c9d0e1f2a3b4c5d6e",
    message: "feat(search): rank answers by recency when decisions changed",
    author: "Maya Okafor",
    daysAgo: 0.3,
  },
  {
    sha: "4b7e1d2c9a8f3e6b5c4d2a1f0e9d8c7b6a5f4e3d",
    message: "feat(templates): add 1:1, retro and customer call templates",
    author: "Jonas Keller",
    daysAgo: 1.2,
  },
  {
    sha: "c3a9e8f7d6b5a4c3e2f1d0c9b8a7e6f5d4c3b2a1",
    message:
      "fix(calendar): stop duplicating recurring meetings after TZ change",
    author: "Priya Raman",
    daysAgo: 2.4,
  },
  {
    sha: "e1f2d3c4b5a6978877665544332211ffeeddccbb",
    message: "feat(linear): turn action items into Linear issues",
    author: "Maya Okafor",
    daysAgo: 4.1,
  },
  {
    sha: "a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9",
    message: "perf(summaries): stream summaries for meetings under 30 min",
    author: "Jonas Keller",
    daysAgo: 5.5,
  },
] as const;

export const DEMO_GITHUB_PULLS = [
  {
    number: 482,
    title: "Smart Search: prefer the latest decision",
    body: "When a decision was revisited, Smart Search now surfaces the most recent one first and links the earlier discussion.",
    author: "maya",
    labels: ["search", "feature"],
    daysAgo: 0.3,
  },
  {
    number: 479,
    title: "Meeting templates",
    body: "Adds templates for 1:1s, retros and customer calls. Teams can edit them under Settings › Templates.",
    author: "jonas",
    labels: ["feature"],
    daysAgo: 1.2,
  },
  {
    number: 476,
    title: "Linear sync for action items",
    body: "Action items can be sent to Linear with one click; the issue links back to the transcript moment.",
    author: "maya",
    labels: ["integrations", "feature"],
    daysAgo: 4.1,
  },
] as const;

export const DEMO_GITHUB_RELEASES = [
  {
    tag: "v3.8.0",
    name: "Templates and smarter search",
    body: "- Meeting templates\n- Smart Search prefers the latest decision\n- Calendar sync fixes",
    daysAgo: 1,
  },
  {
    tag: "v3.7.0",
    name: "Linear sync",
    body: "- Send action items to Linear\n- Faster summaries for short meetings",
    daysAgo: 8,
  },
] as const;

/** Branches the demo repository lists; the first one is the default. */
export const DEMO_GITHUB_BRANCHES = [
  "main",
  "develop",
  "release/3.8",
  "feat/meeting-templates",
  "fix/calendar-timezones",
] as const;

/**
 * Every file in the demo repository. Folders are derived from these paths,
 * so `changelogs` and `blog` (the default publishing folders) exist.
 */
export const DEMO_GITHUB_FILES = [
  ".github/workflows/ci.yml",
  ".github/workflows/release.yml",
  "README.md",
  "package.json",
  "blog/2026-09-meeting-templates.mdx",
  "blog/2026-08-linear-sync.mdx",
  "blog/images/meeting-templates.png",
  "changelogs/v3.7.0.mdx",
  "changelogs/v3.8.0.mdx",
  "docs/getting-started.md",
  "docs/guides/smart-search.md",
  "docs/guides/templates.md",
  "docs/integrations/calendar.md",
  "docs/integrations/linear.md",
  "public/favicon.svg",
  "public/images/og.png",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/components/search/smart-search.tsx",
  "src/components/templates/template-picker.tsx",
  "src/lib/calendar/sync.ts",
  "src/lib/linear/client.ts",
  "src/lib/summaries/stream.ts",
] as const;
