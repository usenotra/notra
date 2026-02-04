import { generateText, Output } from "ai";
import { ROUTING_PROMPT } from "@/lib/ai/prompts/router";
import { openrouter } from "@/lib/openrouter";
import { routingDecisionSchema } from "./schemas";
import type { RoutingDecision, RoutingResult } from "./types";

export const MODELS = {
  router: "openai/gpt-oss-120b", // Only for routing decisions, no supermemory
  simple: "openai/gpt-5.1",
  complex: "moonshotai/kimi-k2.5",
} as const;

export async function routeMessage(
  userMessage: string,
  hasGitHubContext: boolean
): Promise<RoutingDecision> {
  const contextHint = hasGitHubContext
    ? "\n\nNote: The user has added GitHub repository context, suggesting they may want to work with GitHub data."
    : "";

  const routerModel = openrouter(MODELS.router);

  const { output } = await generateText({
    model: routerModel,
    output: Output.object({ schema: routingDecisionSchema }),
    system: ROUTING_PROMPT,
    prompt: `Classify this user message:

"${userMessage}"${contextHint}`,
  });

  return output;
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
