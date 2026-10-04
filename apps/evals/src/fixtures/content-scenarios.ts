/**
 * Source data for the content harness suites. Each scenario is what the
 * GitHub tools would return for one repository and lookback window.
 */

export interface FixtureCommit {
  sha: string;
  message: string;
  authorName: string;
  authoredAt: string;
}

export interface FixturePullRequest {
  number: number;
  title: string;
  body: string;
  labels: string[];
  authorLogin: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  mergedAt: string;
}

export interface FixtureRelease {
  tagName: string;
  name: string;
  body: string;
  publishedAt: string;
}

export interface FixtureBrand {
  companyName: string;
  companyDescription: string;
  audience: string;
  language?: string;
  toneProfile: "Conversational" | "Professional" | "Casual" | "Formal";
  customTone?: string;
  references: {
    type: "twitter_post" | "custom";
    content: string;
    note?: string;
  }[];
}

export type ContentDecision = "create" | "skip";

export interface MustMention {
  readonly fact: string;
  readonly pattern: RegExp;
}

export interface ContentScenario {
  id: string;
  title: string;
  owner: string;
  repo: string;
  integrationId: string;
  lookbackLabel: string;
  lookbackStartIso: string;
  lookbackEndIso: string;
  todayUtc: string;
  brand: FixtureBrand;
  commits: FixtureCommit[];
  pullRequests: FixturePullRequest[];
  releases: FixtureRelease[];
  expected: {
    decision: ContentDecision;
    /** User-facing facts a good post mentions. */
    keyFacts: string[];
    /** Internal details that should not show up in the post. */
    avoid: string[];
    /**
     * Facts every long-form post must state (breaking changes, required
     * actions), checked by pattern. Tweets are exempt because of their length.
     */
    mustMention?: readonly MustMention[];
  };
}

const ACME_BRAND: FixtureBrand = {
  companyName: "Lumen",
  companyDescription:
    "Lumen is a product analytics tool for B2B SaaS teams that shows which features drive retention.",
  audience: "Product managers and founders at B2B SaaS companies",
  toneProfile: "Conversational",
  references: [
    {
      type: "twitter_post",
      content:
        "Funnels now load 3x faster on big workspaces. We rewrote the query planner so you can stop staring at spinners.",
    },
    {
      type: "custom",
      content:
        "We write like a teammate explaining a change over coffee: short sentences, concrete numbers, no hype words.",
      note: "House style",
    },
  ],
};

const KIWI_BRAND: FixtureBrand = {
  companyName: "Kiwi Pay",
  companyDescription:
    "Kiwi Pay ist eine Zahlungsplattform für kleine Onlineshops in Deutschland und Österreich.",
  audience: "Shopbetreiber und Entwickler kleiner E-Commerce-Teams",
  language: "German",
  toneProfile: "Professional",
  references: [
    {
      type: "custom",
      content:
        "Wir schreiben klar und direkt, duzen unsere Kunden und erklären technische Änderungen ohne Fachchinesisch.",
    },
  ],
};

const DEVTOOL_BRAND: FixtureBrand = {
  companyName: "Fern CLI",
  companyDescription:
    "Fern CLI is an open source command line tool for managing preview environments.",
  audience: "Developers and platform engineers",
  toneProfile: "Casual",
  customTone: "Dry, a little nerdy, never salesy.",
  references: [
    {
      type: "twitter_post",
      content:
        "fern up now reuses warm containers. Preview envs boot in 8s instead of 40s. Your coffee will get cold slower.",
    },
  ],
};

const WEEK = {
  lookbackLabel: "last 7 days",
  lookbackStartIso: "2026-09-25T00:00:00.000Z",
  lookbackEndIso: "2026-10-02T00:00:00.000Z",
  todayUtc: "2026-10-02",
};

export const CONTENT_SCENARIOS: readonly ContentScenario[] = [
  {
    id: "feature-week",
    title: "Feature week: cohort export + Slack alerts",
    owner: "lumen-hq",
    repo: "lumen",
    integrationId: "int_lumen",
    ...WEEK,
    brand: ACME_BRAND,
    commits: [
      {
        sha: "a1f3c9e",
        message: "feat(cohorts): export cohorts as CSV and to HubSpot (#812)",
        authorName: "maria",
        authoredAt: "2026-09-29T10:12:00Z",
      },
      {
        sha: "b72d01a",
        message: "feat(alerts): send retention drop alerts to Slack (#809)",
        authorName: "tom",
        authoredAt: "2026-09-28T15:40:00Z",
      },
      {
        sha: "c3e8812",
        message:
          "fix(funnels): keep date range when switching workspaces (#815)",
        authorName: "maria",
        authoredAt: "2026-09-30T09:01:00Z",
      },
      {
        sha: "d9a07f2",
        message: "chore(deps): bump @tanstack/react-query to 5.91 (#816)",
        authorName: "renovate[bot]",
        authoredAt: "2026-09-30T11:22:00Z",
      },
      {
        sha: "e11b4c3",
        message: "ci: cache playwright browsers (#817)",
        authorName: "tom",
        authoredAt: "2026-10-01T08:15:00Z",
      },
    ],
    pullRequests: [
      {
        number: 812,
        title: "Export cohorts as CSV and to HubSpot",
        body: "Users can now export any saved cohort as a CSV file or push it to HubSpot as a static list. HubSpot sync needs the HubSpot integration connected. Exports include user id, email, first seen and the cohort's defining event counts.",
        labels: ["feature"],
        authorLogin: "maria",
        additions: 640,
        deletions: 52,
        changedFiles: 18,
        mergedAt: "2026-09-29T10:12:00Z",
      },
      {
        number: 809,
        title: "Retention drop alerts in Slack",
        body: "New alert type: when weekly retention for a cohort drops more than a configurable threshold (default 10%), Lumen posts a message to a chosen Slack channel with the cohort, the drop and a link to the chart.",
        labels: ["feature"],
        authorLogin: "tom",
        additions: 410,
        deletions: 30,
        changedFiles: 11,
        mergedAt: "2026-09-28T15:40:00Z",
      },
      {
        number: 815,
        title: "Keep funnel date range when switching workspaces",
        body: "Previously switching workspaces reset the funnel date range to the last 30 days. It now keeps the selected range.",
        labels: ["bug"],
        authorLogin: "maria",
        additions: 22,
        deletions: 9,
        changedFiles: 2,
        mergedAt: "2026-09-30T09:01:00Z",
      },
      {
        number: 816,
        title: "chore(deps): bump @tanstack/react-query to 5.91",
        body: "Automated dependency update.",
        labels: ["dependencies"],
        authorLogin: "renovate[bot]",
        additions: 12,
        deletions: 12,
        changedFiles: 2,
        mergedAt: "2026-09-30T11:22:00Z",
      },
    ],
    releases: [],
    expected: {
      decision: "create",
      keyFacts: [
        "Cohorts can be exported as CSV",
        "Cohorts can be pushed to HubSpot",
        "Retention drop alerts are sent to Slack",
        "Funnel date range is kept when switching workspaces",
      ],
      avoid: ["react-query dependency bump", "Playwright CI caching"],
    },
  },
  {
    id: "chores-only",
    title: "Only dependency bumps and CI chores",
    owner: "lumen-hq",
    repo: "lumen",
    integrationId: "int_lumen",
    ...WEEK,
    brand: ACME_BRAND,
    commits: [
      {
        sha: "f00a111",
        message: "chore(deps): bump eslint to 9.40 (#820)",
        authorName: "renovate[bot]",
        authoredAt: "2026-09-26T07:00:00Z",
      },
      {
        sha: "f00a112",
        message: "chore(deps): bump typescript to 7.0.2 (#821)",
        authorName: "renovate[bot]",
        authoredAt: "2026-09-27T07:00:00Z",
      },
      {
        sha: "f00a113",
        message: "ci: run unit tests on node 24 (#822)",
        authorName: "tom",
        authoredAt: "2026-09-28T12:00:00Z",
      },
      {
        sha: "f00a114",
        message: "chore: fix typo in CONTRIBUTING.md",
        authorName: "maria",
        authoredAt: "2026-09-29T12:00:00Z",
      },
    ],
    pullRequests: [
      {
        number: 820,
        title: "chore(deps): bump eslint to 9.40",
        body: "Automated dependency update.",
        labels: ["dependencies"],
        authorLogin: "renovate[bot]",
        additions: 8,
        deletions: 8,
        changedFiles: 2,
        mergedAt: "2026-09-26T07:00:00Z",
      },
      {
        number: 821,
        title: "chore(deps): bump typescript to 7.0.2",
        body: "Automated dependency update.",
        labels: ["dependencies"],
        authorLogin: "renovate[bot]",
        additions: 4,
        deletions: 4,
        changedFiles: 2,
        mergedAt: "2026-09-27T07:00:00Z",
      },
      {
        number: 822,
        title: "ci: run unit tests on node 24",
        body: "Bumps the CI matrix.",
        labels: ["ci"],
        authorLogin: "tom",
        additions: 3,
        deletions: 3,
        changedFiles: 1,
        mergedAt: "2026-09-28T12:00:00Z",
      },
    ],
    releases: [],
    expected: {
      decision: "skip",
      keyFacts: [],
      avoid: ["eslint", "typescript bump"],
    },
  },
  {
    id: "empty-window",
    title: "No activity in the window",
    owner: "fern-sh",
    repo: "fern",
    integrationId: "int_fern",
    ...WEEK,
    brand: DEVTOOL_BRAND,
    commits: [],
    pullRequests: [],
    releases: [],
    expected: { decision: "skip", keyFacts: [], avoid: [] },
  },
  {
    id: "major-release",
    title: "Major release v3.0 with release notes",
    owner: "fern-sh",
    repo: "fern",
    integrationId: "int_fern",
    ...WEEK,
    brand: DEVTOOL_BRAND,
    commits: [
      {
        sha: "9a8b7c6",
        message: "release: v3.0.0",
        authorName: "jo",
        authoredAt: "2026-09-30T16:00:00Z",
      },
      {
        sha: "8b7c6d5",
        message: "feat!: drop support for docker-compose v1 (#401)",
        authorName: "jo",
        authoredAt: "2026-09-29T10:00:00Z",
      },
      {
        sha: "7c6d5e4",
        message: "feat(up): warm container pool, 8s boots (#398)",
        authorName: "lee",
        authoredAt: "2026-09-27T10:00:00Z",
      },
      {
        sha: "6d5e4f3",
        message:
          "feat(share): fern share gives a public URL for a preview env (#395)",
        authorName: "lee",
        authoredAt: "2026-09-26T10:00:00Z",
      },
    ],
    pullRequests: [
      {
        number: 401,
        title: "Drop docker-compose v1 support",
        body: "BREAKING: fern now requires Docker Compose v2. v1 has been EOL since 2023. Run `docker compose version` to check.",
        labels: ["breaking"],
        authorLogin: "jo",
        additions: 120,
        deletions: 480,
        changedFiles: 14,
        mergedAt: "2026-09-29T10:00:00Z",
      },
      {
        number: 398,
        title: "Warm container pool for fern up",
        body: "fern up keeps a pool of warm base containers. Median boot time on our benchmark repo went from 40s to 8s.",
        labels: ["feature", "performance"],
        authorLogin: "lee",
        additions: 530,
        deletions: 90,
        changedFiles: 9,
        mergedAt: "2026-09-27T10:00:00Z",
      },
      {
        number: 395,
        title: "fern share",
        body: "New command `fern share` exposes a running preview env on a public HTTPS URL that expires after 24h.",
        labels: ["feature"],
        authorLogin: "lee",
        additions: 300,
        deletions: 10,
        changedFiles: 7,
        mergedAt: "2026-09-26T10:00:00Z",
      },
    ],
    releases: [
      {
        tagName: "v3.0.0",
        name: "Fern 3.0",
        body: "## Highlights\n- `fern share`: public URLs for preview envs (#395)\n- Warm container pool: boots in ~8s instead of ~40s (#398)\n\n## Breaking\n- Docker Compose v1 is no longer supported (#401)",
        publishedAt: "2026-09-30T16:00:00Z",
      },
    ],
    expected: {
      decision: "create",
      keyFacts: [
        "fern share creates a public URL for a preview environment",
        "Preview environments boot in about 8 seconds instead of 40",
        "Docker Compose v1 is no longer supported (breaking change)",
        "Version 3.0",
      ],
      avoid: [],
      mustMention: [
        {
          fact: "Docker Compose v1 is no longer supported",
          pattern: /compose (?:v|version )?1\b/i,
        },
      ],
    },
  },
  {
    id: "internal-refactor",
    title: "Internal refactors with no user-facing change",
    owner: "lumen-hq",
    repo: "lumen",
    integrationId: "int_lumen",
    ...WEEK,
    brand: ACME_BRAND,
    commits: [
      {
        sha: "1a2b3c4",
        message: "refactor(api): split query service into modules (#830)",
        authorName: "tom",
        authoredAt: "2026-09-26T10:00:00Z",
      },
      {
        sha: "2b3c4d5",
        message: "test: add coverage for retention calculator (#831)",
        authorName: "maria",
        authoredAt: "2026-09-27T10:00:00Z",
      },
      {
        sha: "3c4d5e6",
        message: "refactor: rename internal metric ids (#832)",
        authorName: "tom",
        authoredAt: "2026-09-29T10:00:00Z",
      },
    ],
    pullRequests: [
      {
        number: 830,
        title: "Split query service into modules",
        body: "No behaviour change. Moves query building into separate modules to make future work easier.",
        labels: ["refactor"],
        authorLogin: "tom",
        additions: 900,
        deletions: 870,
        changedFiles: 31,
        mergedAt: "2026-09-26T10:00:00Z",
      },
      {
        number: 831,
        title: "Add coverage for retention calculator",
        body: "Tests only.",
        labels: ["tests"],
        authorLogin: "maria",
        additions: 240,
        deletions: 0,
        changedFiles: 3,
        mergedAt: "2026-09-27T10:00:00Z",
      },
      {
        number: 832,
        title: "Rename internal metric ids",
        body: "Internal rename, no API change.",
        labels: ["refactor"],
        authorLogin: "tom",
        additions: 60,
        deletions: 60,
        changedFiles: 12,
        mergedAt: "2026-09-29T10:00:00Z",
      },
    ],
    releases: [],
    expected: {
      decision: "skip",
      keyFacts: [],
      avoid: ["query service refactor"],
    },
  },
  {
    id: "german-shop",
    title: "German brand: Apple Pay + refund fix",
    owner: "kiwipay",
    repo: "checkout",
    integrationId: "int_kiwi",
    ...WEEK,
    brand: KIWI_BRAND,
    commits: [
      {
        sha: "aa11bb2",
        message: "feat(checkout): Apple Pay for Shopify stores (#212)",
        authorName: "lena",
        authoredAt: "2026-09-28T10:00:00Z",
      },
      {
        sha: "bb22cc3",
        message:
          "fix(refunds): partial refunds no longer refund shipping twice (#215)",
        authorName: "max",
        authoredAt: "2026-09-30T10:00:00Z",
      },
      {
        sha: "cc33dd4",
        message: "chore(deps): bump stripe-node (#216)",
        authorName: "renovate[bot]",
        authoredAt: "2026-09-30T12:00:00Z",
      },
    ],
    pullRequests: [
      {
        number: 212,
        title: "Apple Pay for Shopify stores",
        body: "Shops using our Shopify app can enable Apple Pay in the Kiwi Pay dashboard under Zahlungsarten. No extra fees.",
        labels: ["feature"],
        authorLogin: "lena",
        additions: 380,
        deletions: 40,
        changedFiles: 10,
        mergedAt: "2026-09-28T10:00:00Z",
      },
      {
        number: 215,
        title: "Partial refunds refunded shipping twice",
        body: "When a merchant issued two partial refunds on the same order, shipping costs were refunded twice. Fixed and affected merchants were contacted.",
        labels: ["bug"],
        authorLogin: "max",
        additions: 45,
        deletions: 12,
        changedFiles: 3,
        mergedAt: "2026-09-30T10:00:00Z",
      },
    ],
    releases: [],
    expected: {
      decision: "create",
      keyFacts: [
        "Apple Pay is available for Shopify stores",
        "Partial refunds no longer refund shipping twice",
      ],
      avoid: ["stripe-node bump"],
    },
  },
  {
    id: "single-fix",
    title: "One meaningful bug fix among chores",
    owner: "fern-sh",
    repo: "fern",
    integrationId: "int_fern",
    ...WEEK,
    brand: DEVTOOL_BRAND,
    commits: [
      {
        sha: "5e4f3a2",
        message:
          "fix(up): stop leaking volumes when a preview env is torn down (#410)",
        authorName: "jo",
        authoredAt: "2026-09-28T10:00:00Z",
      },
      {
        sha: "4f3a2b1",
        message: "chore(deps): bump cobra (#411)",
        authorName: "renovate[bot]",
        authoredAt: "2026-09-29T10:00:00Z",
      },
      {
        sha: "3a2b1c0",
        message: "docs: fix broken link in README (#412)",
        authorName: "lee",
        authoredAt: "2026-09-30T10:00:00Z",
      },
    ],
    pullRequests: [
      {
        number: 410,
        title: "Stop leaking volumes on teardown",
        body: "fern down left anonymous Docker volumes behind. On busy machines this ate tens of GB. They are now removed with the env. Run `fern prune --volumes` once to clean up old ones.",
        labels: ["bug"],
        authorLogin: "jo",
        additions: 60,
        deletions: 8,
        changedFiles: 4,
        mergedAt: "2026-09-28T10:00:00Z",
      },
    ],
    releases: [],
    expected: {
      decision: "create",
      keyFacts: [
        "fern down no longer leaves Docker volumes behind",
        "fern prune --volumes cleans up old volumes",
      ],
      avoid: ["cobra bump", "README link"],
    },
  },
];

export function findScenario(id: string): ContentScenario {
  const scenario = CONTENT_SCENARIOS.find((item) => item.id === id);
  if (!scenario) {
    throw new Error(`Unknown content scenario ${id}`);
  }
  return scenario;
}
