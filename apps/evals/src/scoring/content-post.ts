import type { ContentAgentProfile } from "@notra/ai/types/agents";

import type { ContentScenario } from "../fixtures/content-scenarios";
import type { HarnessOutput } from "../harness/content-harness";
import type { CaseScore, FieldScore, ScoreContext } from "../types/eval";
import { judgeWithJev } from "./jev-judge";
import {
  countDashes,
  germanShare,
  metaHits,
  plainLength,
  slopHits,
  titleProblem,
} from "./text-checks";

const TWEET_MAX_CHARS = 280;
// The SDK turns rejected calls into tool-error parts carrying only the error
// message (not the class name), e.g. "Invalid input for tool skip: ...".
const REJECTED_CALL_REGEX =
  /Invalid input for tool |tried to call unavailable tool |InvalidToolInputError|NoSuchToolError/;
const LINKEDIN_MAX_CHARS = 1600;

const POST_QUESTIONS = {
  grounded: {
    type: "boolean",
    instructions:
      "Is every factual claim in post supported by sourceData? Product names, numbers, features and fixes must appear in sourceData. Style and opinions do not count as claims.",
  },
  coverage: {
    type: "score",
    instructions:
      "How many of keyFacts does post communicate (in any language or wording)?",
    criteria: ["None of them", "Some of them", "Most of them", "All of them"],
  },
  avoidsInternal: {
    type: "boolean",
    instructions:
      "Does post leave out every item listed in internalOnly (dependency bumps, CI changes, refactors and similar internal work)? True if none of them are mentioned.",
  },
  humanVoice: {
    type: "score",
    instructions:
      "How natural does post read for brandVoice: like a person on the team wrote it, or like generic AI marketing copy?",
    criteria: [
      "Generic AI marketing copy",
      "Mostly generic with some natural lines",
      "Natural and specific, sounds like the team",
    ],
  },
} as const;

/** Everything the writer saw, so attributions and brand facts count as grounded. */
export function sourceDataFor(scenario: ContentScenario) {
  return {
    company: `${scenario.brand.companyName}: ${scenario.brand.companyDescription}`,
    repository: `${scenario.owner}/${scenario.repo}`,
    lookback: `${scenario.lookbackStartIso} to ${scenario.lookbackEndIso}`,
    commits: scenario.commits.map(
      (commit) => `${commit.sha} ${commit.message} (${commit.authorName})`
    ),
    pullRequests: scenario.pullRequests.map((pr) => ({
      number: pr.number,
      title: pr.title,
      body: pr.body,
      author: pr.authorLogin,
      labels: pr.labels,
    })),
    releases: scenario.releases.map((release) => ({
      tag: release.tagName,
      name: release.name,
      body: release.body,
    })),
  };
}

function field(
  name: string,
  score: number,
  extra: Partial<FieldScore> = {}
): FieldScore {
  return { field: name, score: Math.max(0, Math.min(1, score)), ...extra };
}

export interface PostScore extends CaseScore {
  readonly judgeCostUsd: number;
}

/** Shared scoring for every stage that ends in createPost / skip / fail. */
export async function scoreContentOutput(
  output: HarnessOutput,
  scenario: ContentScenario,
  contentType: ContentAgentProfile,
  ctx: ScoreContext
): Promise<PostScore> {
  const expected = scenario.expected.decision;
  // Execution errors (404 for a missing release) mirror real API answers;
  // only calls the SDK rejected count against the model.
  const toolErrors = (output.toolErrors ?? []).filter((error) =>
    REJECTED_CALL_REGEX.test(error)
  );
  const fields: FieldScore[] = [
    field("decision", output.decision === expected ? 1 : 0, {
      expected,
      actual: output.decision,
      note: output.reason,
    }),
    field("valid-tool-calls", toolErrors.length === 0 ? 1 : 0, {
      note: toolErrors[0],
    }),
  ];

  if (expected === "skip") {
    const decided = fields[0]?.score ?? 0;
    const score =
      fields.reduce((sum, item) => sum + item.score, 0) / fields.length;
    return { score, pass: decided === 1, fields, judgeCostUsd: 0 };
  }

  const post = output.post;
  if (!post) {
    for (const name of [
      "no-dashes",
      "length",
      "slop",
      "language",
      "title",
      "no-meta",
      "must-mention",
      "grounded",
      "coverage",
      "avoids-internal",
      "human-voice",
    ]) {
      fields.push(field(name, 0, { note: "no post created" }));
    }
    return { score: 0, pass: false, fields, judgeCostUsd: 0 };
  }

  const fullText = `${post.title}\n${post.markdown}\n${post.recommendations ?? ""}`;
  // Recommendations are publishing advice, not claims about the product.
  const judgedText = `${post.title}\n${post.markdown}`;
  const dashes = countDashes(fullText);
  fields.push(
    field("no-dashes", dashes === 0 ? 1 : 0, {
      note: dashes ? `${dashes} em/en dashes` : undefined,
    })
  );

  const length = plainLength(post.markdown);
  let lengthOk = length > 0;
  if (contentType.contentType === "twitter_post") {
    lengthOk = length <= TWEET_MAX_CHARS;
  } else if (contentType.contentType === "linkedin_post") {
    lengthOk = length <= LINKEDIN_MAX_CHARS;
  }
  fields.push(field("length", lengthOk ? 1 : 0, { note: `${length} chars` }));

  const hits = slopHits(fullText);
  fields.push(
    field("slop", 1 - hits.length * 0.34, {
      note: hits.length ? hits.join(", ") : undefined,
    })
  );

  if (scenario.brand.language === "German") {
    const share = germanShare(post.markdown);
    fields.push(
      field("language", share >= 0.6 ? 1 : 0, {
        note: `${Math.round(share * 100)}% German markers`,
      })
    );
  } else {
    fields.push(field("language", germanShare(post.markdown) < 0.4 ? 1 : 0));
  }

  const badTitle = titleProblem(post.title);
  fields.push(
    field("title", badTitle ? 0 : 1, { actual: post.title, note: badTitle })
  );

  const meta = metaHits(judgedText);
  fields.push(
    field("no-meta", meta.length ? 0 : 1, {
      note: meta.length ? meta.join(", ") : undefined,
    })
  );

  const required =
    contentType.contentType === "twitter_post"
      ? []
      : (scenario.expected.mustMention ?? []);
  const missing = required.filter((item) => !item.pattern.test(judgedText));
  fields.push(
    field(
      "must-mention",
      required.length ? 1 - missing.length / required.length : 1,
      {
        note: missing.length
          ? `missing: ${missing.map((item) => item.fact).join("; ")}`
          : undefined,
      }
    )
  );

  const verdict = await judgeWithJev({
    feature: "content-post-judge",
    state: {
      contentType: contentType.contentLabel,
      brandVoice: `${scenario.brand.companyName}: ${scenario.brand.toneProfile}${scenario.brand.customTone ? `, ${scenario.brand.customTone}` : ""}`,
      sourceData: sourceDataFor(scenario),
      keyFacts: scenario.expected.keyFacts,
      internalOnly: scenario.expected.avoid,
      post: judgedText,
    },
    questions: POST_QUESTIONS,
    abortSignal: ctx.abortSignal,
    demo: ctx.demo,
    demoQuality: hits.length === 0 && dashes === 0 ? 0.9 : 0.6,
  });
  fields.push(field("grounded", verdict.values.grounded ?? 0));
  fields.push(field("coverage", verdict.values.coverage ?? 0));
  fields.push(field("avoids-internal", verdict.values.avoidsInternal ?? 0));
  fields.push(field("human-voice", verdict.values.humanVoice ?? 0));

  const score =
    fields.reduce((sum, item) => sum + item.score, 0) / fields.length;
  const pass =
    output.decision === "create" &&
    dashes === 0 &&
    lengthOk &&
    !badTitle &&
    meta.length === 0 &&
    missing.length === 0 &&
    (verdict.values.grounded ?? 0) >= 0.5 &&
    (verdict.values.coverage ?? 0) >= 0.66;
  return { score, pass, fields, judgeCostUsd: verdict.costUsd };
}
