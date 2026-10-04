import type {
  GeoSentimentBucket,
  GeoSentimentResponse,
} from "@notra/geo-core/types/geo-sentiment";
import { summarizeSentiment } from "@notra/geo-core/utils/geo-sentiment";
import type { PostCollectionSummary } from "@notra/schemas/dashboard/content";

import type {
  BreakUiDataset,
  BreakUiFixture,
  BreakUiSentimentCounts,
} from "@/types/design-system/break-ui";
import type {
  InvitationSummary,
  MemberWithUser,
  OrganizationRow,
} from "@/types/organizations/actions";

/**
 * Fixtures for /design-system/break-ui. "Worst case" values are either real
 * naming patterns or the limits the schemas allow (org name 100 chars,
 * collection name 200 chars); fields without a limit get long but believable
 * values.
 */
export const BREAK_UI_DATASETS = [
  "demo",
  "worst",
  "empty",
  "one",
  "huge",
] as const;

export const BREAK_UI_DATASET_LABELS: Record<BreakUiDataset, string> = {
  demo: "Demo data",
  worst: "Worst case",
  empty: "Empty",
  one: "One",
  huge: "1,284 rows",
};

const DAY_MS = 86_400_000;
const NOW = Date.now();
const daysAgo = (days: number) => new Date(NOW - days * DAY_MS);
const isoDaysAgo = (days: number) => daysAgo(days).toISOString();
const BROKEN_IMAGE_URL = "https://example.com/avatars/deleted-user-4821.png";
const TREND_DAYS = 14;
const HUGE_MEMBER_COUNT = 1284;
const HUGE_INVITATION_COUNT = 212;

// ---------------------------------------------------------------- sentiment

function sentimentBucket(
  counts: Omit<BreakUiSentimentCounts, "engine">
): GeoSentimentBucket {
  const classified = counts.positive + counts.neutral + counts.negative;
  const mentions = classified + (counts.unrated ?? 0);
  return summarizeSentiment([
    {
      totalChecks: mentions + (counts.missed ?? 0),
      mentions,
      positive: counts.positive,
      neutral: counts.neutral,
      negative: counts.negative,
      lastCheckedAt: isoDaysAgo(0),
    },
  ]);
}

function sentimentResponse(
  rows: readonly BreakUiSentimentCounts[]
): GeoSentimentResponse {
  const engines = rows.map(({ engine, ...counts }) => ({
    ...sentimentBucket(counts),
    engine,
  }));
  const summary = summarizeSentiment(engines);
  // Spread each total over the range; the remainder lands on the latest days,
  // so a single answer shows up as one bar today.
  const share = (total: number, index: number) =>
    Math.floor(total / TREND_DAYS) +
    (index >= TREND_DAYS - (total % TREND_DAYS) ? 1 : 0);
  const points = Array.from({ length: TREND_DAYS }, (_, index) => ({
    ...sentimentBucket({
      positive: share(summary.positive, index),
      neutral: share(summary.neutral, index),
      negative: share(summary.negative, index),
    }),
    day: isoDaysAgo(TREND_DAYS - 1 - index).slice(0, 10),
  }));
  return { configured: true, summary, engines, points };
}

const DEMO_SENTIMENT = sentimentResponse([
  { engine: "openai/gpt-5.4-grounded", positive: 38, neutral: 14, negative: 3 },
  {
    engine: "anthropic/claude-sonnet-4.6-grounded",
    positive: 31,
    neutral: 12,
    negative: 4,
  },
  { engine: "perplexity/sonar", positive: 22, neutral: 15, negative: 6 },
  {
    engine: "google/gemini-3-flash-grounded",
    positive: 19,
    neutral: 17,
    negative: 8,
  },
]);

/**
 * Every engine family a scan can produce, plus engines that left the catalog
 * (their raw id becomes the label), a perfect and a zero score, a single
 * rated answer, five-digit counts, and engines that mentioned the brand but
 * never got a rating.
 */
const WORST_SENTIMENT = sentimentResponse([
  {
    engine: "openai/gpt-5.4-grounded",
    positive: 9214,
    neutral: 2871,
    negative: 762,
  },
  {
    engine: "anthropic/claude-sonnet-4.6-grounded",
    positive: 41,
    neutral: 0,
    negative: 0,
  },
  { engine: "perplexity/sonar", positive: 0, neutral: 0, negative: 17 },
  {
    engine: "google/gemini-3-flash-grounded",
    positive: 1,
    neutral: 0,
    negative: 0,
  },
  { engine: "ai-overview", positive: 12, neutral: 30, negative: 9 },
  { engine: "microsoft/copilot", positive: 7, neutral: 6, negative: 7 },
  { engine: "xai/grok-4", positive: 3, neutral: 9, negative: 11 },
  { engine: "mistral/mistral-large", positive: 4, neutral: 4, negative: 1 },
  { engine: "deepseek/deepseek-v3.2", positive: 6, neutral: 2, negative: 2 },
  {
    engine: "meta-llama/llama-4-maverick",
    positive: 5,
    neutral: 5,
    negative: 0,
  },
  {
    engine: "moonshotai/kimi-k2-thinking",
    positive: 2,
    neutral: 3,
    negative: 4,
  },
  { engine: "z-ai/glm-4.6", positive: 1, neutral: 1, negative: 1 },
  { engine: "qwen/qwen3-max", positive: 3, neutral: 1, negative: 0 },
  {
    engine: "tencent/hunyuan-a13b-instruct",
    positive: 0,
    neutral: 2,
    negative: 0,
  },
  {
    engine: "xiaomi/mimo-v2-flash",
    positive: 0,
    neutral: 0,
    negative: 0,
    unrated: 6,
  },
  { engine: "cursor", positive: 8, neutral: 1, negative: 0 },
  { engine: "claude-code", positive: 6, neutral: 2, negative: 1 },
  { engine: "codex", positive: 2, neutral: 2, negative: 2 },
  {
    engine: "opencode",
    positive: 0,
    neutral: 0,
    negative: 0,
    unrated: 2,
    missed: 40,
  },
  {
    engine: "cohere/command-a-reasoning-08-2025",
    positive: 2,
    neutral: 1,
    negative: 0,
  },
  {
    engine: "ibm-granite/granite-4.0-h-micro-instruct",
    positive: 1,
    neutral: 3,
    negative: 0,
  },
  { engine: "amazon/nova-premier-v1", positive: 0, neutral: 1, negative: 1 },
]);

const ONE_SENTIMENT = sentimentResponse([
  { engine: "openai/gpt-5.4-grounded", positive: 1, neutral: 0, negative: 0 },
]);

// ------------------------------------------------------------ organizations

function organization(
  id: string,
  name: string,
  logo: string | null = null
): OrganizationRow {
  return {
    id,
    name,
    slug: id.replace("org_", ""),
    logo,
    createdAt: daysAgo(400),
    metadata: null,
    heardAboutNotraSource: null,
    heardAboutNotraOther: null,
    geoIngestTokenGeneration: 1,
    feedbackIngestTokenGeneration: 1,
    onboardingCompleted: true,
    onboardingDismissed: false,
    onboardingAgentRan: true,
    onboardingAgentStartedAt: null,
    workosOrgId: null,
  };
}

const DEMO_ORG = organization("org_acme", "Acme");
const DEMO_ORGANIZATIONS = [
  DEMO_ORG,
  organization("org_globex", "Globex"),
  organization("org_initech", "Initech"),
];

/** 96 characters, under the 100-character limit of `organizationNameSchema`. */
const WORST_ORG = organization(
  "org_northwind",
  "Northwind Industries Holdings — Global Platform Infrastructure & Developer Experience (EMEA)",
  BROKEN_IMAGE_URL
);
const WORST_ORGANIZATIONS = [
  WORST_ORG,
  organization("org_fox", "🦊 Fox Labs"),
  organization("org_jo", "Jo"),
  organization("org_cyberagent", "株式会社サイバーエージェント"),
  organization("org_noor", "نور الهدى للتقنية"),
  organization("org_dang", "Đặng Thị Ngọc Hân Studio"),
  organization("org_bfz", "Benachrichtigungseinstellungen GmbH"),
  organization("org_wk", "Wiśniewska-Kowalczyk Architekci"),
  organization("org_priya", "👩🏽‍💻 Priya's Side Projects"),
  organization("org_acme", "Acme"),
  organization("org_acme_staging", "Acme (staging)"),
  organization("org_acme_staging_old", "Acme (staging) — old, do not use"),
  organization("org_script", "<script>alert(1)</script> &amp; Co"),
  organization("org_ops", "ops"),
];

// ------------------------------------------------------------------ members

function member(
  index: number,
  name: string,
  email: string,
  role = "member",
  image: string | null = null
): MemberWithUser {
  return {
    id: `mem_${index}`,
    organizationId: WORST_ORG.id,
    userId: `user_${index}`,
    role,
    createdAt: daysAgo(index),
    user: { id: `user_${index}`, name, email, image },
  };
}

const DEMO_MEMBERS = [
  member(1, "Jane Doe", "jane@acme.com", "owner"),
  member(2, "John Smith", "john@acme.com", "admin"),
  member(3, "Ada Lovelace", "ada@acme.com"),
];

const WORST_MEMBERS = [
  member(
    1,
    "Aleksandra Wiśniewska-Kowalczyk",
    "aleksandra.wisniewska-kowalczyk@northwind-industries-holdings.example.com",
    "owner"
  ),
  member(
    2,
    "Bartholomew Fitzgerald",
    "bartholomew.fitzgerald@northwind-industries-holdings.example.com",
    "admin"
  ),
  member(3, "Jo", "a@b.co"),
  member(4, "J", "j@example.com"),
  member(5, "", "first.last+billing-notifications@example.com"),
  member(6, "🦊 Fox", "fox@example.com", "member", BROKEN_IMAGE_URL),
  member(7, "王秀英", "wang.xiuying@example.cn", "member", BROKEN_IMAGE_URL),
  member(8, "نور الهدى عبد الرحمن", "noor@example.sa"),
  member(
    9,
    "Đặng Thị Ngọc Hân",
    "han.dang@example.vn",
    "member",
    BROKEN_IMAGE_URL
  ),
  member(
    10,
    "Christopher Alexander Montgomery III",
    "cmontgomery@example.com",
    "billing-admin"
  ),
  member(11, "  Sam   Lee ", "sam@example.com", "member", BROKEN_IMAGE_URL),
  member(12, "dana", "ops@sub.department.region.example.co.uk"),
];

const HUGE_MEMBERS = Array.from({ length: HUGE_MEMBER_COUNT }, (_, index) =>
  index < WORST_MEMBERS.length
    ? WORST_MEMBERS[index]
    : member(
        index + 1,
        `Teammate ${index + 1}`,
        `teammate.${index + 1}@northwind-industries-holdings.example.com`
      )
).filter((row): row is MemberWithUser => row !== undefined);

function invitation(
  index: number,
  email: string,
  role: string | null,
  expiresInDays: number
): InvitationSummary {
  return {
    id: `inv_${index}`,
    email,
    role,
    status: "pending",
    expiresAt: daysAgo(-expiresInDays),
    createdAt: daysAgo(7 - expiresInDays),
  };
}

const DEMO_INVITATIONS = [invitation(1, "sam@acme.com", "member", 5)];

const WORST_INVITATIONS = [
  invitation(
    1,
    "konstantin.oberhauser-wettstein@northwind-industries-holdings.example.com",
    "admin",
    6
  ),
  invitation(2, "first.last+billing-notifications@example.com", null, 0),
  // Still "pending" in the database, but past its expiry date.
  invitation(3, "jo@b.co", "member", -12),
  invitation(4, "ops@sub.department.region.example.co.uk", "billing-admin", 3),
];

const HUGE_INVITATIONS = Array.from(
  { length: HUGE_INVITATION_COUNT },
  (_, index) =>
    invitation(
      index + 1,
      `new.hire.${index + 1}@northwind-industries-holdings.example.com`,
      "member",
      (index % 14) - 7
    )
);

// -------------------------------------------------------------- collections

function collection(
  overrides: Partial<PostCollectionSummary> & Pick<PostCollectionSummary, "id">
): PostCollectionSummary {
  return {
    name: "Weekly changelog",
    source: "schedule",
    nameSource: "generated",
    contentTypes: ["changelog"],
    postCount: 1,
    singlePost: { id: `post_${overrides.id}`, title: "Weekly changelog" },
    expectedPostCount: null,
    isGenerating: false,
    statusSummary: { total: 1, draft: 1, published: 0 },
    createdAt: isoDaysAgo(1),
    ...overrides,
  };
}

const DEMO_COLLECTIONS = [
  collection({
    id: "col_1",
    singlePost: { id: "post_1", title: "What's new in March" },
    statusSummary: { total: 1, draft: 0, published: 1 },
  }),
  collection({
    id: "col_2",
    name: "Launch week",
    source: "chat",
    contentTypes: ["blog_post", "twitter_post", "linkedin_post"],
    postCount: 3,
    singlePost: null,
    statusSummary: { total: 3, draft: 3, published: 0 },
    createdAt: isoDaysAgo(3),
  }),
  collection({
    id: "col_3",
    contentTypes: ["blog_post"],
    source: "manual",
    singlePost: { id: "post_3", title: "How we cut build times in half" },
    createdAt: isoDaysAgo(6),
  }),
];

const WORST_COLLECTIONS = [
  collection({
    id: "col_long",
    // An AI-generated post title; post titles have no length limit.
    singlePost: {
      id: "post_long",
      title:
        "Introducing Notra Workspaces for Enterprise: Single Sign-On, Audit Logs, Granular Role-Based Access Control, and Everything Else Your Security Team Asked For in the Q3 Review",
    },
    statusSummary: { total: 1, draft: 0, published: 1 },
  }),
  collection({
    id: "col_formats",
    // 200 characters: the `renameCollectionSchema` limit.
    name: "Q3 Board Deck — FINAL (revised) v12 [approved by legal] — Launch week assets for the Northwind enterprise rollout across EMEA, APAC and North America, plus partner co-marketing and investor follow-ups",
    nameSource: "user",
    source: "automation",
    contentTypes: [
      "changelog",
      "blog_post",
      "twitter_post",
      "linkedin_post",
      "investor_update",
      "image",
    ],
    postCount: 1284,
    singlePost: null,
    statusSummary: { total: 1284, draft: 1, published: 1283 },
    createdAt: isoDaysAgo(3 * 365),
  }),
  collection({
    id: "col_generating",
    name: "Benachrichtigungseinstellungen-Änderungsprotokoll",
    source: "api",
    contentTypes: ["blog_post", "linkedin_post"],
    postCount: 3,
    expectedPostCount: 12,
    isGenerating: true,
    singlePost: null,
    statusSummary: { total: 3, draft: 3, published: 0 },
    createdAt: isoDaysAgo(0),
  }),
  collection({
    id: "col_empty_title",
    singlePost: { id: "post_empty", title: "" },
  }),
  collection({
    id: "col_escape",
    source: "backfill",
    contentTypes: ["linkedin_post"],
    singlePost: {
      id: "post_escape",
      title: "<script>alert(1)</script> &amp; **bold** release notes",
    },
  }),
  collection({
    id: "col_empty",
    name: "Untitled",
    source: "manual",
    contentTypes: [],
    postCount: 0,
    singlePost: null,
    statusSummary: { total: 0, draft: 0, published: 0 },
  }),
  collection({
    id: "col_newline",
    contentTypes: ["twitter_post"],
    source: "chat",
    singlePost: {
      id: "post_newline",
      title: "Line one\nLine two of a pasted tweet",
    },
  }),
];

const HUGE_COLLECTION_TOTAL = 1284;

// ----------------------------------------------------------------- datasets

export const BREAK_UI_FIXTURES: Record<BreakUiDataset, BreakUiFixture> = {
  demo: {
    sentiment: DEMO_SENTIMENT,
    organizations: DEMO_ORGANIZATIONS,
    activeOrganization: DEMO_ORG,
    members: DEMO_MEMBERS,
    invitations: DEMO_INVITATIONS,
    collections: DEMO_COLLECTIONS,
    collectionTotal: DEMO_COLLECTIONS.length,
  },
  worst: {
    sentiment: WORST_SENTIMENT,
    organizations: WORST_ORGANIZATIONS,
    activeOrganization: WORST_ORG,
    members: WORST_MEMBERS,
    invitations: WORST_INVITATIONS,
    collections: WORST_COLLECTIONS,
    collectionTotal: WORST_COLLECTIONS.length,
  },
  empty: {
    sentiment: null,
    organizations: [DEMO_ORG],
    activeOrganization: DEMO_ORG,
    members: [],
    invitations: [],
    collections: [],
    collectionTotal: 0,
  },
  one: {
    sentiment: ONE_SENTIMENT,
    organizations: [DEMO_ORG],
    activeOrganization: DEMO_ORG,
    members: DEMO_MEMBERS.slice(0, 1),
    invitations: DEMO_INVITATIONS,
    collections: DEMO_COLLECTIONS.slice(0, 1),
    collectionTotal: 1,
  },
  huge: {
    sentiment: WORST_SENTIMENT,
    organizations: WORST_ORGANIZATIONS,
    activeOrganization: WORST_ORG,
    members: HUGE_MEMBERS,
    invitations: HUGE_INVITATIONS,
    collections: WORST_COLLECTIONS,
    collectionTotal: HUGE_COLLECTION_TOTAL,
  },
};
