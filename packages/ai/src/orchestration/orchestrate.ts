import { createModel } from "@notra/ai/model";
import { getContentEditorChatPrompt } from "@notra/ai/prompts/content-editor";
import { withRouterDefaults } from "@notra/ai/provider-options";
import type {
  OrchestrateDeps,
  OrchestrateInput,
  OrchestrateResult,
} from "@notra/ai/types/orchestration";
import { normalizeMarkdownFileAttachments } from "@notra/ai/utils/message-attachments";
import { summarizeRouteUsage } from "@notra/ai/utils/route-usage";
import { buildExperimentalTelemetry } from "@notra/ai/utils/tcc";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

import {
  hasEnabledGitHubIntegration,
  hasEnabledLinearIntegration,
  validateIntegrations,
} from "./integration-validator";
import { routeAndSelectModel } from "./router";
import { getThinkingProviderOptions } from "./thinking";
import {
  buildToolSet,
  getLinearContextFromIntegrations,
  getRepoContextFromIntegrations,
} from "./tool-registry";

export async function orchestrateChat(
  input: OrchestrateInput,
  deps?: OrchestrateDeps
): Promise<OrchestrateResult> {
  const {
    organizationId,
    messages,
    currentMarkdown,
    contentType,
    currentPostId,
    userId,
    imageDefaults,
    useMarkup,
    selection,
    context = [],
    maxSteps = 1,
    log: inputLog,
    timezone,
    telemetryMetadata,
    documentMode,
  } = input;

  const log = deps?.log ?? inputLog;

  const validatedIntegrations = await validateIntegrations(
    organizationId,
    context,
    deps?.integrationFetchers
  );

  const hasGitHub = hasEnabledGitHubIntegration(validatedIntegrations);
  const hasLinear = hasEnabledLinearIntegration(validatedIntegrations);
  const hasIntegrationContext = hasGitHub || hasLinear;

  const lastUserMessage = getLastUserMessage(messages);
  const hasAttachments = lastUserMessageHasNonTextParts(messages);
  const routedDecision = await routeAndSelectModel(
    lastUserMessage,
    hasIntegrationContext,
    log,
    hasAttachments,
    telemetryMetadata
  );
  const routingDecision = {
    ...routedDecision,
    requiresTools: true,
    reasoning: routedDecision.requiresTools
      ? routedDecision.reasoning
      : `${routedDecision.reasoning} (tools available by default)`,
  };

  const modelWithMemory = createModel(
    organizationId,
    routingDecision.model,
    {},
    log
  );

  const { tools, descriptions } = buildToolSet(
    {
      organizationId,
      currentMarkdown,
      contentType,
      currentPostId,
      userId,
      imageDefaults,
      useMarkup,
      validatedIntegrations,
    },
    {
      resolveContext: deps?.resolveContext,
      resolveLinearContext: deps?.resolveLinearContext,
    }
  );

  const repoContext = getRepoContextFromIntegrations(validatedIntegrations);
  const linearContext = getLinearContextFromIntegrations(validatedIntegrations);

  const systemPrompt = getContentEditorChatPrompt({
    selection,
    contentType,
    documentMode,
    repoContext,
    linearContext,
    toolDescriptions: descriptions,
    hasGitHubEnabled: hasGitHub,
    hasLinearEnabled: hasLinear,
    timezone,
  });

  const messagesForModel = normalizeMarkdownFileAttachments(messages);

  const stream = streamText({
    model: modelWithMemory,
    system: systemPrompt,
    messages: await convertToModelMessages(messagesForModel, {
      ignoreIncompleteToolCalls: true,
    }),
    tools,
    stopWhen: stepCountIs(maxSteps),
    providerOptions: withRouterDefaults(
      getThinkingProviderOptions(
        routingDecision.model,
        true,
        routingDecision.thinkingLevel ?? "low"
      ),
      {
        modelId: routingDecision.model,
      }
    ),
    experimental_telemetry: buildExperimentalTelemetry(telemetryMetadata),
    async onFinish({ totalUsage, steps }) {
      await deps?.onUsage?.(
        totalUsage,
        routingDecision.model,
        await summarizeRouteUsage(steps)
      );
    },
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

function lastUserMessageHasNonTextParts(messages: UIMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!message || message.role !== "user") {
      continue;
    }
    if (!Array.isArray(message.parts)) {
      return false;
    }
    return message.parts.some((part) => part.type !== "text");
  }
  return false;
}

function getLastUserMessage(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!message) {
      continue;
    }
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
