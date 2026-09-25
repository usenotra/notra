import { getEvaluationClient } from "@notra/ai/evaluation/client";
import { gateway } from "@notra/ai/gateway";
import {
  type AILogTarget,
  wrapModelWithObservability,
} from "@notra/ai/observability";
import {
  buildRoutingEvaluationState,
  routingDecisionFromEvaluation,
} from "@notra/ai/orchestration/router-evaluation";
import {
  ROUTING_EVALUATION_QUESTIONS,
  ROUTING_PROMPT,
} from "@notra/ai/prompts/router";
import { withRouterDefaults } from "@notra/ai/provider-options";
import { routingDecisionSchema } from "@notra/ai/schemas/orchestration";
import type {
  AutoSelection,
  RoutingDecision,
} from "@notra/ai/types/orchestration";
import { buildTelemetryOptions, type TccMetadata } from "@notra/ai/utils/tcc";
import { generateObject, generateText } from "ai";

const LLM_ROUTER_FALLBACK_MODEL = "openai/gpt-oss-120b";
const ROUTER_EVALUATION_FEATURE = "chat_router";
// Slower than this and the LLM router would have answered anyway.
const ROUTER_EVALUATION_TIMEOUT_MS = 2500;

const AUTO_POOL = {
  trivial: "anthropic/claude-sonnet-5",
  everyday: "anthropic/claude-sonnet-5",
  deep: "anthropic/claude-opus-5.5",
} as const;

const TRIVIAL_MESSAGE_PATTERNS = [
  /^(hi|hello|hey|yo|sup|hallo|moin|servus)\b[\s!.?]*$/i,
  /^(thanks?|thank you|thx|danke|ty)\b[\s!.?]*$/i,
  /^(ok(ay)?|cool|nice|got it|alles klar)\b[\s!.?]*$/i,
  /^(bye|cya|tschüss|ciao)\b[\s!.?]*$/i,
];

const EXPLICIT_TOOL_REQUEST_PATTERNS = [
  /\b(call|use|run|execute|invoke|exercise|trigger|test)\b[\s\S]{0,120}\btools?\b/i,
  /\btools?\b[\s\S]{0,120}\b(call|use|run|execute|invoke|exercise|trigger|test)\b/i,
];

export function isTrivialMessage(userMessage: string): boolean {
  const trimmed = userMessage.trim();
  if (!trimmed || trimmed.length > 40) {
    return false;
  }
  return TRIVIAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isExplicitToolRequest(userMessage: string): boolean {
  return EXPLICIT_TOOL_REQUEST_PATTERNS.some((pattern) =>
    pattern.test(userMessage)
  );
}

function matchTrivialFastPath(
  userMessage: string,
  hasIntegrationContext: boolean,
  hasAttachments: boolean
): RoutingDecision | undefined {
  if (hasIntegrationContext || hasAttachments) {
    return undefined;
  }
  if (!isTrivialMessage(userMessage)) {
    return undefined;
  }
  return {
    complexity: "simple",
    requiresTools: false,
    reasoningHeavy: false,
    reasoning: "Trivial greeting/acknowledgement — skipped router call",
  };
}

export function selectAutoModel(decision: RoutingDecision): AutoSelection {
  if (decision.complexity === "simple" && !decision.requiresTools) {
    return { model: AUTO_POOL.trivial, thinkingLevel: "off" };
  }
  if (decision.reasoningHeavy) {
    return { model: AUTO_POOL.deep, thinkingLevel: "high" };
  }
  if (decision.complexity === "complex") {
    return { model: AUTO_POOL.everyday, thinkingLevel: "medium" };
  }
  return { model: AUTO_POOL.everyday, thinkingLevel: "low" };
}

export async function routeMessage(
  userMessage: string,
  hasIntegrationContext: boolean,
  log?: AILogTarget,
  hasAttachments = false,
  telemetryMetadata?: TccMetadata
): Promise<RoutingDecision> {
  const fastPath = matchTrivialFastPath(
    userMessage,
    hasIntegrationContext,
    hasAttachments
  );
  if (fastPath) {
    return fastPath;
  }

  if (isExplicitToolRequest(userMessage)) {
    return {
      complexity: "complex",
      requiresTools: true,
      reasoningHeavy: false,
      reasoning:
        "The user explicitly asked to call, test, or exercise tools, so tools are required.",
    };
  }

  // Typed evaluation first (~300 ms); the LLM router below is the fallback
  // when the gateway is unavailable, the flag is off, or the call fails.
  const evaluation = await getEvaluationClient().tryEvaluate({
    feature: ROUTER_EVALUATION_FEATURE,
    organizationId:
      typeof telemetryMetadata?.organizationId === "string"
        ? telemetryMetadata.organizationId
        : undefined,
    state: buildRoutingEvaluationState(userMessage, hasIntegrationContext),
    questions: ROUTING_EVALUATION_QUESTIONS,
    timeoutMs: ROUTER_EVALUATION_TIMEOUT_MS,
  });
  if (evaluation) {
    return routingDecisionFromEvaluation(evaluation);
  }

  const contextHint = hasIntegrationContext
    ? "\n\nNote: The user has connected integration context (for example GitHub or Linear), so they may want help using external project data."
    : "";

  const routerModel = wrapModelWithObservability(
    gateway(LLM_ROUTER_FALLBACK_MODEL, {
      organizationId:
        typeof telemetryMetadata?.organizationId === "string"
          ? telemetryMetadata.organizationId
          : undefined,
    }),
    log
  );

  try {
    const { object } = await generateObject({
      model: routerModel,
      schema: routingDecisionSchema,
      instructions: ROUTING_PROMPT,
      prompt: `Classify this user message:

"${userMessage}"${contextHint}`,
      providerOptions: withRouterDefaults(
        { gateway: { tags: ["chat-router"] } },
        {
          modelId: LLM_ROUTER_FALLBACK_MODEL,
        }
      ),
      repairText: async ({ text, error }) => {
        try {
          const { text: repairedText } = await generateText({
            model: routerModel,
            instructions:
              "Repair the router output so it is valid JSON matching the required schema. Return only JSON.",
            prompt: [
              "Schema:",
              JSON.stringify({
                type: "object",
                properties: {
                  complexity: { enum: ["simple", "complex"] },
                  requiresTools: { type: "boolean" },
                  reasoningHeavy: { type: "boolean" },
                  reasoning: { type: "string" },
                },
                required: [
                  "complexity",
                  "requiresTools",
                  "reasoningHeavy",
                  "reasoning",
                ],
                additionalProperties: false,
              }),
              "Invalid output:",
              text,
              "Validation error:",
              error.message,
            ].join("\n"),
            maxOutputTokens: 200,
            providerOptions: withRouterDefaults(
              { gateway: { tags: ["chat-router"] } },
              {
                modelId: LLM_ROUTER_FALLBACK_MODEL,
              }
            ),
            ...buildTelemetryOptions(telemetryMetadata),
          });

          return repairedText;
        } catch (repairError) {
          console.error("[Chat Router] Repair failed", {
            error:
              repairError instanceof Error
                ? repairError.message
                : String(repairError),
          });
          return null;
        }
      },
      // generateObject has no runtime context in AI SDK 7, so TCC metadata
      // cannot be attached here; the repair call above still carries it.
    });

    return object;
  } catch (error) {
    console.error("[Chat Router] Routing failed; using fallback", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      complexity: "complex",
      requiresTools: false,
      reasoningHeavy: false,
      reasoning:
        "Router structured output failed; falling back to Sonnet without tool routing.",
    };
  }
}
