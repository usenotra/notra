import { COLLECTION_TITLE_MODEL_ID } from "@notra/ai/constants/collection-title";
import { COLLECTION_TITLE_SYSTEM_PROMPT } from "@notra/ai/prompts/collection-title";
import {
  COLLECTION_TITLE_MAX_LENGTH,
  collectionTitleResultSchema,
} from "@notra/ai/schemas/collection-title";

import { callObject } from "../models/gateway";
import { judgeWithJev } from "../scoring/jev-judge";
import { DATE_REGEX, GENERIC_TITLES } from "../scoring/text-checks";
import type { EvalCase, EvalSuite, FieldScore } from "../types/eval";

interface TitlePost {
  type: string;
  title: string;
  excerpt: string;
}

interface TitleInput {
  organization: string;
  posts: TitlePost[];
}

interface TitleExpected {
  /** At least one must appear with this exact spelling. */
  mustInclude: string[];
}

const SLUG_REGEX = /\b[\w-]+\/[\w-]+\b/;

const CASES: EvalCase<TitleInput, TitleExpected>[] = [
  {
    id: "lumen-week",
    title: "Lumen: cohort export + Slack alerts (changelog + tweet)",
    input: {
      organization: "Lumen",
      posts: [
        {
          type: "changelog",
          title: "Cohort exports and Slack retention alerts",
          excerpt:
            "Export any saved cohort as CSV or push it to HubSpot. Retention drop alerts now post to Slack when weekly retention falls more than 10%. Funnels keep the date range when switching workspaces.",
        },
        {
          type: "twitter post",
          title: "Slack alerts tweet",
          excerpt:
            "Retention dropped? Lumen now tells you in Slack before your churn report does.",
        },
      ],
    },
    expected: { mustInclude: ["cohort", "Cohort", "Slack"] },
  },
  {
    id: "fern-release",
    title: "Fern CLI 3.0 release (blog + linkedin)",
    input: {
      organization: "Fern",
      posts: [
        {
          type: "blog post",
          title: "Fern 3.0: share preview envs and boot in 8 seconds",
          excerpt:
            "fern share gives a running preview env a public HTTPS URL. A warm container pool cuts boots from 40s to 8s. Docker Compose v1 support is gone.",
        },
        {
          type: "linkedin post",
          title: "Fern 3.0 on LinkedIn",
          excerpt:
            "Preview environments that boot in 8 seconds, and a public link to share them with your PM.",
        },
      ],
    },
    expected: { mustInclude: ["Fern 3.0", "fern share", "Fern"] },
  },
  {
    id: "camelcase-brand",
    title: "Brand spelled in camel case (SentDM)",
    input: {
      organization: "SentDM",
      posts: [
        {
          type: "changelog",
          title: "SentDM inbox rules",
          excerpt:
            "SentDM can now auto-label DMs with inbox rules. Rules match on keywords, sender and platform.",
        },
        {
          type: "twitter post",
          title: "Inbox rules tweet",
          excerpt:
            "SentDM inbox rules: label DMs automatically by keyword, sender or platform.",
        },
      ],
    },
    expected: { mustInclude: ["SentDM"] },
  },
  {
    id: "repo-slug-trap",
    title: "Posts mention an owner/repo slug",
    input: {
      organization: "Kiwi Pay",
      posts: [
        {
          type: "changelog",
          title: "kiwipay/checkout: Apple Pay for Shopify",
          excerpt:
            "Merged in kiwipay/checkout: Apple Pay for Shopify stores, plus a fix for partial refunds refunding shipping twice.",
        },
      ],
    },
    expected: { mustInclude: ["Apple Pay"] },
  },
  {
    id: "german-batch",
    title: "German posts",
    input: {
      organization: "Kiwi Pay",
      posts: [
        {
          type: "blog post",
          title: "Apple Pay für Shopify-Stores",
          excerpt:
            "Ab sofort kannst du Apple Pay in deinem Shopify-Store aktivieren, ohne zusätzliche Gebühren.",
        },
        {
          type: "linkedin post",
          title: "Teilerstattungen repariert",
          excerpt:
            "Zwei Teilerstattungen auf dieselbe Bestellung haben die Versandkosten doppelt erstattet. Das ist behoben.",
        },
      ],
    },
    expected: { mustInclude: ["Apple Pay"] },
  },
  {
    id: "vague-posts",
    title: "Vague posts tempt a generic title",
    input: {
      organization: "Lumen",
      posts: [
        {
          type: "changelog",
          title: "Various improvements",
          excerpt:
            "Faster funnel loading on large workspaces, a clearer empty state for new projects and fixed tooltip positions on retention charts.",
        },
      ],
    },
    expected: { mustInclude: ["funnel", "Funnel", "retention", "Retention"] },
  },
];

/** Same prompt text as packages/ai/src/jobs/collection-title.ts. */
function buildPromptText(input: TitleInput): string {
  const summaries = input.posts.map((post, index) =>
    [`Post ${index + 1} (${post.type}): ${post.title}`, post.excerpt].join("\n")
  );
  return [`Organization: ${input.organization}`, ...summaries].join("\n\n");
}

export const collectionTitleSuite: EvalSuite<
  TitleInput,
  TitleExpected,
  { title: string }
> = {
  id: "collection-title",
  name: "Collection title",
  kind: "generation",
  stage: "jobs/collection-title.ts generateCollectionTitle",
  description:
    "Names a batch of generated posts. Same system prompt and schema as prod. Deterministic checks for length, quotes/punctuation, dates, generic labels, owner/repo slugs and exact brand spelling, plus a Jev check that the title is concrete.",
  cases: CASES,
  productionModel: COLLECTION_TITLE_MODEL_ID,
  defaultContenders: [
    "openai/gpt-6-luna",
    "openai/gpt-5.4-nano",
    "anthropic/claude-haiku-4.5",
  ],
  timeoutMs: 30_000,
  async run(input, ctx) {
    const result = await callObject({
      modelId: ctx.contender.modelId,
      feature: "collection-title",
      schema: collectionTitleResultSchema,
      system: COLLECTION_TITLE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: buildPromptText(input) }],
        },
      ],
      abortSignal: ctx.abortSignal,
    });
    return { ...result, transcript: result.output.title };
  },
  async score(output, testCase, ctx) {
    const title = output.title.trim();
    const fields: FieldScore[] = [
      {
        field: "length",
        score:
          title.length >= 3 && title.length <= COLLECTION_TITLE_MAX_LENGTH
            ? 1
            : 0,
        note: `${title.length} chars`,
      },
      { field: "format", score: /^["'“]|["'”]$|[.!?:;]$/.test(title) ? 0 : 1 },
      { field: "no-dates", score: DATE_REGEX.test(title) ? 0 : 1 },
      { field: "not-generic", score: GENERIC_TITLES.test(title) ? 0 : 1 },
      { field: "no-slug", score: SLUG_REGEX.test(title) ? 0 : 1 },
      {
        field: "names",
        score: testCase.expected.mustInclude.some((term) =>
          title.includes(term)
        )
          ? 1
          : 0,
        expected: testCase.expected.mustInclude.join(" | "),
        actual: title,
      },
    ];
    const verdict = await judgeWithJev({
      feature: "collection-title-judge",
      state: { posts: testCase.input.posts, title },
      questions: {
        concrete: {
          type: "boolean",
          instructions:
            "Does title name the concrete features, fixes or announcements the posts cover, instead of vague filler like 'updates' or 'improvements'?",
        },
      },
      abortSignal: ctx.abortSignal,
      demo: ctx.demo,
      demoQuality: fields.every((item) => item.score === 1) ? 0.9 : 0.5,
    });
    fields.push({ field: "concrete", score: verdict.values.concrete ?? 0 });
    const score =
      fields.reduce((sum, item) => sum + item.score, 0) / fields.length;
    return {
      score,
      pass: fields.every((item) => item.score >= 0.5),
      fields,
      judgeCostUsd: verdict.costUsd,
      judgeCostSource: verdict.costSource,
    };
  },
  demoOutput(testCase, demo) {
    const good =
      `${testCase.expected.mustInclude[0]} ${testCase.input.posts[0]?.title.split(" ").slice(1, 4).join(" ") ?? ""}`.trim();
    return {
      title: demo.hit()
        ? good
        : demo.pick("Weekly updates", [
            "Weekly updates",
            `"${good}".`,
            "Changelog",
          ]),
    };
  },
};
