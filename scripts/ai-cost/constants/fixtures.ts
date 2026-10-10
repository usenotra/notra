export const FEEDBACK_OUTPUT = {
  title: "Exports fail",
  kind: "bug",
  sentiment: "negative",
} as const;

export const FEEDBACK_FIELD_COMBINATIONS = [
  { id: "missing-all", fields: [] },
  { id: "supplied-kind", fields: ["kind"] },
  { id: "supplied-sentiment", fields: ["sentiment"] },
  { id: "supplied-labels-title-missing", fields: ["kind", "sentiment"] },
  { id: "supplied-title", fields: ["title"] },
  { id: "supplied-title-and-kind", fields: ["title", "kind"] },
  { id: "supplied-title-and-sentiment", fields: ["title", "sentiment"] },
  { id: "supplied-all", fields: ["title", "kind", "sentiment"] },
] as const;

export const FEEDBACK_FIXTURES = [
  ...FEEDBACK_FIELD_COMBINATIONS.map(({ id, fields }) => ({
    id,
    suppliedFields: Object.fromEntries(
      fields.map((field) => [field, FEEDBACK_OUTPUT[field]])
    ),
    evaluationAvailable: true,
  })),
  {
    id: "evaluation-unavailable",
    suppliedFields: {},
    evaluationAvailable: false,
  },
];

export const FEEDBACK_INPUT = {
  organizationId: "org_benchmark",
  feedbackId: "feedback_benchmark",
  message: "CSV export fails with a timeout when I download my report.",
  contextUrl: "https://example.invalid/reports",
  agentClient: "offline-benchmark",
};

export const PREFIX_MESSAGES = [
  FEEDBACK_INPUT.message,
  "CSV export fails when I export another report.",
] as const;

export const REFERENCE_FIXTURE = {
  id: "reference_benchmark",
  organizationId: "org_benchmark",
  brandSettingsId: "brand_benchmark",
  type: "custom",
  content: "Exports now include every column. Download a CSV from Reports.",
  note: "Use concrete product details and short sentences.",
  sourceCapturedAt: new Date("2026-10-01T00:00:00.000Z"),
  sourceContentHash: "a".repeat(64),
  sourceSnapshotKey: "private/reference-snapshots/org_benchmark/reference.json",
  sourceUrl: "https://example.invalid/private-reference",
  applicableTo: ["all"],
  createdAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-02T00:00:00.000Z"),
} as const;

// Synthetic accounting inputs, not provider measurements or a savings forecast.
export const ACCOUNTING_FIXTURE = {
  modelId: "openai/gpt-5.4-mini",
  usage: {
    inputTokens: 100_000,
    outputTokens: 100_000,
    totalTokens: 200_000,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  },
  reportedRoute: {
    gateway: "vercel",
    requestedModel: "openai/gpt-5.4-mini",
    model: "openai/gpt-5.4-mini",
    reason: "paid",
    costUsd: 0.42,
    gatewayCostUsd: 0.02,
    upstreamInferenceCostUsd: 0.4,
    isByok: true,
  },
  estimatedRoute: {
    gateway: "vercel",
    requestedModel: "openai/gpt-5.6-sol",
    model: "openai/gpt-5.4-mini",
    reason: "paid",
  },
} as const;

export const CACHE_PHASES = [
  "cold",
  "warm",
  "read-outage",
  "write-outage",
  "recovered-cold",
  "recovered-warm",
] as const;

export const GEO_FIXTURES = [
  {
    prompt: "Which tool exports reports?",
    answer: "Notra is a good choice.",
    mentioned: true,
  },
  {
    prompt: "Which tool should I use?",
    answer: "Other tools are a good choice.",
    mentioned: false,
  },
  {
    prompt: "Which tools support CSV?",
    answer: "Notra is an option, alongside other tools.",
    mentioned: true,
  },
] as const;

export const GEO_CONTEXT = {
  organizationId: "org_benchmark",
  projectId: "project_benchmark",
  scanId: "scan_benchmark",
  companyName: "Notra",
  aliases: [],
};
