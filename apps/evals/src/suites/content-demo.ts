import type { ContentAgentProfile } from "@notra/ai/types/agents";

import type { ContentScenario } from "../fixtures/content-scenarios";
import type {
  HarnessDecision,
  HarnessOutput,
} from "../harness/content-harness";
import type { DemoContext } from "../types/eval";

const DEMO_SLOP = [
  "We're thrilled to announce",
  "This game-changer will unlock",
  "Seamlessly elevate your workflow",
];

/** Plausible createPost/skip output for demo runs. */
export function demoContentOutput(
  scenario: ContentScenario,
  contentType: ContentAgentProfile,
  demo: DemoContext
): HarnessOutput {
  const decisions: HarnessDecision[] = ["create", "skip", "fail"];
  const decision = demo.pick<HarnessDecision>(
    scenario.expected.decision,
    decisions
  );
  const toolCalls = [
    "listAvailableSkills",
    "getSkillByName",
    "getBrandReferences",
    "getCommitsByTimeframe",
  ];

  if (decision !== "create") {
    toolCalls.push(decision);
    return {
      decision,
      reason:
        decision === "skip"
          ? "Only dependency bumps and CI changes in the window."
          : "GitHub returned an error for the selected repository.",
      toolCalls,
      steps: toolCalls.length,
    };
  }

  const facts = scenario.expected.keyFacts.filter(() => demo.hit());
  const opener = demo.hit()
    ? `Here is what changed at ${scenario.brand.companyName} this week.`
    : DEMO_SLOP[Math.floor(demo.rng() * DEMO_SLOP.length)];
  const joiner = demo.hit() ? ". " : " — ";
  const body =
    contentType.contentType === "twitter_post"
      ? `${opener} ${facts.slice(0, 2).join(joiner)}.`
      : [
          opener,
          "",
          ...facts.map((fact) => `- ${fact}`),
          "",
          "Thanks for the feedback that shaped these.",
        ].join("\n");
  toolCalls.push("getSkillByName", "createPost");
  return {
    decision,
    post: {
      title: facts[0] ?? `${scenario.brand.companyName} update`,
      markdown: body,
      recommendations: null,
    },
    toolCalls,
    skillsLoaded: [contentType.skillName, "unslop"],
    steps: toolCalls.length,
  };
}
