import { CONTENT_AGENT_PROFILES } from "@notra/ai/constants/content-agents";
import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import type { ContentAgentProfile } from "@notra/ai/types/agents";

import {
  findScenario,
  type ContentScenario,
} from "../fixtures/content-scenarios";
import {
  type ContentTypeId,
  type HarnessOutput,
  runDraftStage,
  transcriptFor,
} from "../harness/content-harness";
import { sourceDataFor } from "../scoring/content-post";
import { judgeWithJev } from "../scoring/jev-judge";
import { countDashes, slopHits } from "../scoring/text-checks";
import type { EvalCase, EvalSuite, FieldScore } from "../types/eval";

interface UnslopInput {
  scenario: ContentScenario;
  contentType: ContentAgentProfile;
  draftTitle: string;
  draft: string;
}

interface UnslopExpected {
  facts: string[];
}

const DRAFTS: {
  scenarioId: string;
  type: ContentTypeId;
  title: string;
  draft: string;
  facts: string[];
}[] = [
  {
    scenarioId: "feature-week",
    type: "changelog",
    title: "Unlocking Seamless Cohort Exports and Slack Alerts",
    draft: `We're thrilled to announce a game-changing week at Lumen — one that truly elevates how you work with your data.

## Highlights

- **Cohort exports:** Seamlessly export any saved cohort as a CSV file or push it straight to HubSpot as a static list, empowering your go-to-market team.
- **Slack alerts:** Leverage robust retention drop alerts that post to Slack when weekly retention for a cohort drops more than 10%.

## More updates

- Funnels now keep your selected date range when you switch workspaces — no more frustrating resets.

This isn't just an update, it's a testament to our commitment to you.`,
    facts: [
      "Saved cohorts can be exported as CSV",
      "Cohorts can be pushed to HubSpot as a static list",
      "Slack alerts fire when weekly retention drops more than 10%",
      "Funnels keep the date range when switching workspaces",
    ],
  },
  {
    scenarioId: "major-release",
    type: "linkedin_post",
    title: "Fern 3.0 Is Here",
    draft: `In today's fast-paced development landscape, waiting for preview environments is a productivity killer.

That's why we're excited to unveil Fern 3.0 — a cutting-edge release that supercharges your workflow.

🚀 fern share: instantly share a running preview env on a public HTTPS URL that expires after 24 hours.
⚡ Warm container pool: boots now take ~8s instead of ~40s.
⚠️ Docker Compose v1 is no longer supported — time to upgrade!

It's not just faster, it's a whole new way to navigate the complexities of modern delivery. Let's take preview environments to the next level together.`,
    facts: [
      "fern share exposes a preview env on a public HTTPS URL",
      "Shared URLs expire after 24 hours",
      "Boots take about 8 seconds instead of about 40",
      "Docker Compose v1 is no longer supported",
    ],
  },
  {
    scenarioId: "german-shop",
    type: "blog_post",
    title: "Apple Pay: Ein Game-Changer für deinen Shopify-Store",
    draft: `Wir freuen uns riesig, dir heute ein bahnbrechendes Update vorzustellen — Apple Pay ist ab sofort für Shopify-Stores verfügbar!

## Nahtloses Bezahlen

Mit Apple Pay bietest du deinen Kunden ein nahtloses, robustes und revolutionäres Checkout-Erlebnis. Du aktivierst es im Kiwi Pay Dashboard unter Zahlungsarten, ganz ohne zusätzliche Gebühren.

## Ein wichtiger Fix

Außerdem haben wir einen Fehler behoben: Bei zwei Teilerstattungen auf dieselbe Bestellung wurden die Versandkosten doppelt erstattet. Betroffene Händler haben wir bereits kontaktiert.

Es ist nicht nur ein Update, es ist ein Versprechen.`,
    facts: [
      "Apple Pay is available for Shopify stores",
      "It is enabled in the Kiwi Pay dashboard under Zahlungsarten",
      "There are no extra fees",
      "Two partial refunds no longer refund shipping twice",
      "Affected merchants were contacted",
    ],
  },
  {
    scenarioId: "single-fix",
    type: "twitter_post",
    title: "Volume leak fix",
    draft: `Say goodbye to disk bloat — fern down now seamlessly cleans up Docker volumes. Run fern prune --volumes once to unlock tens of GB. Game-changer! 🚀`,
    facts: [
      "fern down now removes Docker volumes",
      "fern prune --volumes cleans up old volumes once",
    ],
  },
];

const QUESTIONS_BASE = {
  grounded: {
    type: "boolean",
    instructions:
      "Is every factual claim in revised supported by original or sourceData? Rewording is fine; invented numbers, features or outcomes are not.",
  },
} as const;

function factQuestions(facts: readonly string[]) {
  const questions: Record<string, { type: "boolean"; instructions: string }> =
    {};
  facts.forEach((fact, index) => {
    questions[`fact${index}`] = {
      type: "boolean",
      instructions: `Does revised still communicate this fact (any wording or language): "${fact}"?`,
    };
  });
  return questions;
}

export const contentUnslopSuite: EvalSuite<
  UnslopInput,
  UnslopExpected,
  HarnessOutput
> = {
  id: "content-unslop",
  name: "Unslop pass",
  kind: "generation",
  stage: "background-gen step 5: unslop final edit",
  description:
    "The final editing pass on its own. The model gets the replayed gathering (with the unslop skill loaded) plus a sloppy draft and must save the cleaned post via createPost. Scores slop removed, dashes, every fact kept (Jev, one question per fact) and grounding against draft + sources.",
  cases: DRAFTS.map((item) => {
    const scenario = findScenario(item.scenarioId);
    const contentType = CONTENT_AGENT_PROFILES[item.type];
    return {
      id: `${item.scenarioId}:${item.type}`,
      title: `${scenario.title} (${contentType.contentLabel})`,
      input: {
        scenario,
        contentType,
        draftTitle: item.title,
        draft: item.draft,
      },
      expected: { facts: item.facts },
    } satisfies EvalCase<UnslopInput, UnslopExpected>;
  }),
  productionModel: AGENT_DEFAULT_MODEL,
  defaultContenders: [
    "anthropic/claude-sonnet-5",
    "openai/gpt-6-sol",
    "openai/gpt-6-luna",
  ],
  timeoutMs: 120_000,
  run: (input, ctx) =>
    runDraftStage({
      modelId: ctx.contender.modelId,
      scenario: input.scenario,
      contentType: input.contentType,
      abortSignal: ctx.abortSignal,
      followUp: [
        {
          role: "assistant",
          content: `Draft before the final editing pass:\n\nTitle: ${input.draftTitle}\n\n${input.draft}`,
        },
        {
          role: "user",
          content:
            "Apply the unslop skill's full instructions to this draft as the final editing pass (post, title and recommendations) while preserving facts and brand voice, then save it with createPost.",
        },
      ],
    }),
  async score(output, testCase, ctx) {
    const post = output.post;
    if (!post) {
      return {
        score: 0,
        pass: false,
        fields: [
          { field: "saved", score: 0, note: `decision ${output.decision}` },
        ],
      };
    }
    const original = `${testCase.input.draftTitle}\n${testCase.input.draft}`;
    const revised = `${post.title}\n${post.markdown}`;
    const before = slopHits(original).length;
    const after = slopHits(revised);
    const verdict = await judgeWithJev({
      feature: "unslop-judge",
      state: {
        original,
        revised,
        sourceData: sourceDataFor(testCase.input.scenario),
      },
      questions: {
        ...QUESTIONS_BASE,
        ...factQuestions(testCase.expected.facts),
      },
      abortSignal: ctx.abortSignal,
      demo: ctx.demo,
      demoQuality: after.length === 0 ? 0.9 : 0.6,
    });
    const factValues = testCase.expected.facts.map(
      (_, index) => verdict.values[`fact${index}`] ?? 0
    );
    const factsKept =
      factValues.filter((value) => value >= 0.5).length /
      Math.max(1, factValues.length);
    const dashes = countDashes(revised);
    const fields: FieldScore[] = [
      {
        field: "slop-removed",
        score: before === 0 ? 1 : Math.max(0, 1 - after.length / before),
        note: after.join(", ") || undefined,
      },
      {
        field: "no-dashes",
        score: dashes === 0 ? 1 : 0,
        note: dashes ? `${dashes} dashes` : undefined,
      },
      {
        field: "facts-kept",
        score: factsKept,
        note: `${Math.round(factsKept * factValues.length)}/${factValues.length}`,
      },
      { field: "grounded", score: verdict.values.grounded ?? 0 },
    ];
    const score =
      fields.reduce((sum, item) => sum + item.score, 0) / fields.length;
    return {
      score,
      pass:
        factsKept === 1 &&
        dashes === 0 &&
        after.length === 0 &&
        (verdict.values.grounded ?? 0) >= 0.5,
      fields,
      judgeCostUsd: verdict.costUsd,
    };
  },
  transcript: transcriptFor,
  demoOutput(testCase, demo) {
    let markdown = testCase.input.draft;
    if (demo.hit()) {
      markdown = markdown
        .replace(/ — /g, ". ")
        .replace(
          /We're thrilled to announce |That's why we're excited to unveil /g,
          ""
        )
        .replace(
          /[Ss]eamless(ly)? |robust |game-chang\w+ |[Gg]ame-[Cc]hanger!? ?/g,
          ""
        );
    }
    return {
      decision: "create",
      post: { title: testCase.input.draftTitle, markdown },
      toolCalls: ["createPost"],
      steps: 1,
    };
  },
};
