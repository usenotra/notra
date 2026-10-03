import { CONTENT_AGENT_PROFILES } from "@notra/ai/constants/content-agents";
import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import type { ContentAgentProfile } from "@notra/ai/types/agents";

import {
  CONTENT_SCENARIOS,
  type ContentScenario,
} from "../fixtures/content-scenarios";
import {
  type ContentTypeId,
  type HarnessOutput,
  runContentAgent,
  runDraftStage,
  transcriptFor,
} from "../harness/content-harness";
import { scoreContentOutput } from "../scoring/content-post";
import type { CaseScore, EvalCase, EvalSuite, FieldScore } from "../types/eval";
import { demoContentOutput } from "./content-demo";

interface ContentInput {
  scenario: ContentScenario;
  contentType: ContentAgentProfile;
}

type ContentExpected = ContentScenario["expected"];

/** Scenario × content type pairs. Skip scenarios run once (as changelog). */
function buildCases(
  types: readonly ContentTypeId[]
): EvalCase<ContentInput, ContentExpected>[] {
  const cases: EvalCase<ContentInput, ContentExpected>[] = [];
  for (const scenario of CONTENT_SCENARIOS) {
    const forScenario: readonly ContentTypeId[] =
      scenario.expected.decision === "skip" ? ["changelog"] : types;
    for (const typeId of forScenario) {
      const contentType = CONTENT_AGENT_PROFILES[typeId];
      cases.push({
        id: `${scenario.id}:${typeId}`,
        title: `${scenario.title} → ${contentType.contentLabel}`,
        input: { scenario, contentType },
        expected: scenario.expected,
        tags: [typeId, scenario.expected.decision],
      });
    }
  }
  return cases;
}

const ALL_TYPES: readonly ContentTypeId[] = [
  "changelog",
  "blog_post",
  "linkedin_post",
  "twitter_post",
];

/** Tool-use expectations on top of the post score, only for the full loop. */
function processFields(
  output: HarnessOutput,
  input: ContentInput
): FieldScore[] {
  const calls = output.toolCalls;
  const skills = output.skillsLoaded ?? [];
  // The dispatcher allows a better-fitting skill than the hint, so any
  // writing skill counts; unslop has to be loaded by name.
  const loadedSkill = skills.some((name) => name !== "unslop");
  const unslopLoaded = skills.includes("unslop");
  const fetchedData =
    calls.includes("getCommitsByTimeframe") ||
    calls.includes("getPullRequests");
  const fields: FieldScore[] = [
    { field: "fetched-sources", score: fetchedData ? 1 : 0 },
  ];
  // Skipping without loading the writing skills is fine.
  if (output.decision === "create") {
    fields.push({
      field: "loaded-skill",
      score: loadedSkill ? 1 : 0,
      note: input.contentType.skillName,
    });
    fields.push({ field: "loaded-unslop", score: unslopLoaded ? 1 : 0 });
  }
  return fields;
}

function mergeScores(base: CaseScore, extra: FieldScore[]): CaseScore {
  const fields = [...base.fields, ...extra];
  return {
    ...base,
    fields,
    score: fields.reduce((sum, item) => sum + item.score, 0) / fields.length,
  };
}

export const contentAgentSuite: EvalSuite<
  ContentInput,
  ContentExpected,
  HarnessOutput
> = {
  id: "content-agent",
  name: "Content agent (full loop)",
  kind: "generation",
  stage: "agents/background-gen.ts runBackgroundGen",
  description:
    "The whole background content agent: real dispatcher prompt, real skills and tool definitions, fixture GitHub data. Scores the create/skip decision, tool use (sources, primary skill, unslop), hard output rules and a Jev judge for grounding, coverage and voice. Slowest and most expensive suite.",
  cases: buildCases(["changelog", "twitter_post"]),
  productionModel: AGENT_DEFAULT_MODEL,
  defaultContenders: ["anthropic/claude-sonnet-5", "openai/gpt-6-sol"],
  labelFields: ["decision"],
  timeoutMs: 240_000,
  run: (input, ctx) =>
    runContentAgent({
      modelId: ctx.contender.modelId,
      scenario: input.scenario,
      contentType: input.contentType,
      abortSignal: ctx.abortSignal,
    }),
  async score(output, testCase, ctx) {
    const base = await scoreContentOutput(
      output,
      testCase.input.scenario,
      testCase.input.contentType,
      ctx
    );
    return mergeScores(base, processFields(output, testCase.input));
  },
  transcript: transcriptFor,
  demoOutput: (testCase, demo) =>
    demoContentOutput(
      testCase.input.scenario,
      testCase.input.contentType,
      demo
    ),
};

export const contentDraftSuite: EvalSuite<
  ContentInput,
  ContentExpected,
  HarnessOutput
> = {
  id: "content-draft",
  name: "Content draft (decide + write)",
  kind: "generation",
  stage: "background-gen step 6: createPost / skip / fail",
  description:
    "The writing step in isolation. Every model starts from the identical replayed gathering (skill catalog, primary skill, brand references, commits, PRs, release, unslop) and continues the real agent loop until createPost, skip or fail. Compares writers and the skip decision without gathering noise.",
  cases: buildCases(ALL_TYPES),
  productionModel: AGENT_DEFAULT_MODEL,
  defaultContenders: [
    "anthropic/claude-sonnet-5",
    "openai/gpt-6-sol",
    "anthropic/claude-opus-5.5",
  ],
  labelFields: ["decision"],
  timeoutMs: 120_000,
  run: (input, ctx) =>
    runDraftStage({
      modelId: ctx.contender.modelId,
      scenario: input.scenario,
      contentType: input.contentType,
      abortSignal: ctx.abortSignal,
    }),
  score: (output, testCase, ctx) =>
    scoreContentOutput(
      output,
      testCase.input.scenario,
      testCase.input.contentType,
      ctx
    ),
  transcript: transcriptFor,
  demoOutput: (testCase, demo) =>
    demoContentOutput(
      testCase.input.scenario,
      testCase.input.contentType,
      demo
    ),
};
