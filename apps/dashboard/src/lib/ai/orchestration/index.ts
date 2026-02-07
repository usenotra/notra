import { withSupermemory } from "@supermemory/tools/ai-sdk";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { getContentEditorChatPrompt } from "@/lib/ai/prompts/content-editor";
import { openrouter } from "@/lib/openrouter";
import {
  hasEnabledGitHubIntegration,
  validateIntegrations,
} from "./integration-validator";
import { routeAndSelectModel } from "./router";
import { buildToolSet, getRepoContextFromIntegrations } from "./tool-registry";
import type { ContextItem, RoutingResult, TextSelection } from "./types";

interface OrchestrateInput {
  organizationId: string;
  messages: UIMessage[];
  currentMarkdown: string;
  selection?: TextSelection;
  context?: ContextItem[];
  maxSteps?: number;
}

interface OrchestrateResult {
  stream: ReturnType<typeof streamText>;
  routingDecision: RoutingResult;
}

export async function orchestrateChat(
  input: OrchestrateInput
): Promise<OrchestrateResult> {
  const {
    organizationId,
    messages,
    currentMarkdown,
    selection,
    context = [],
    maxSteps = 1,
  } = input;

  const validatedIntegrations = await validateIntegrations(
    organizationId,
    context
  );

  const hasGitHub = hasEnabledGitHubIntegration(validatedIntegrations);

  const lastUserMessage = getLastUserMessage(messages);
  const routingDecision = await routeAndSelectModel(lastUserMessage, hasGitHub);

  console.log("[Chat Routing]", {
    model: routingDecision.model,
    complexity: routingDecision.complexity,
    requiresTools: routingDecision.requiresTools,
    reasoning: routingDecision.reasoning,
    hasGitHub,
  });

  const modelWithMemory = withSupermemory(
    openrouter(routingDecision.model),
    organizationId
  );

  const { tools, descriptions } = buildToolSet({
    currentMarkdown,
    validatedIntegrations,
  });

  const repoContext = getRepoContextFromIntegrations(validatedIntegrations);

  const systemPrompt = getContentEditorChatPrompt({
    selection,
    repoContext,
    toolDescriptions: descriptions,
    hasGitHubEnabled: hasGitHub,
  });

  const stream = streamText({
    model: modelWithMemory,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(maxSteps),
    onError({ error }) {
      console.error("[Chat Stream Error]", {
        organizationId,
        model: routingDecision.model,
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });

  return { stream, routingDecision };
}

function getLastUserMessage(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!message) continue;
    if (message.role === "user") {
      const parts = message.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part.type === "text") {
            return part.text;
          }
        }
      }
    }
  }
  return "";
}

export {
  hasEnabledGitHubIntegration,
  validateIntegrations,
} from "./integration-validator";
export {
  MODELS,
  routeAndSelectModel,
  routeMessage,
  selectModel,
} from "./router";
export { buildToolSet } from "./tool-registry";
export * from "./types";
