import { generateObject } from "ai";
import { ROUTING_PROMPT } from "@/lib/ai/prompts/router";
import { openrouter } from "@/lib/openrouter";
import { routingDecisionSchema } from "./schemas";
import type { RoutingDecision, RoutingResult } from "./types";

const MODELS = {
  router: "openai/gpt-oss-120b",
  simple: "openai/gpt-5.1",
  complex: "anthropic/claude-sonnet-4.5",
} as const;

export async function routeMessage(
  userMessage: string,
  hasGitHubContext: boolean
): Promise<RoutingDecision> {
  const contextHint = hasGitHubContext
    ? "\n\nNote: The user has added GitHub repository context, suggesting they may want to work with GitHub data."
    : "";

  const routerModel = openrouter(MODELS.router);

  const { object } = await generateObject({
    model: routerModel,
    schema: routingDecisionSchema,
    system: ROUTING_PROMPT,
    prompt: `Classify this user message:

"${userMessage}"${contextHint}`,
  });

  return object;
}

export function selectModel(decision: RoutingDecision): string {
  if (decision.complexity === "complex") {
    return MODELS.complex;
  }
  return MODELS.simple;
}

export async function routeAndSelectModel(
  userMessage: string,
  hasGitHubContext: boolean
): Promise<RoutingResult> {
  const decision = await routeMessage(userMessage, hasGitHubContext);
  const model = selectModel(decision);

  return {
    model,
    complexity: decision.complexity,
    requiresTools: decision.requiresTools,
    reasoning: decision.reasoning,
  };
}
