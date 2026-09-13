import { gateway } from "@notra/ai/gateway";
import {
  type AILogTarget,
  wrapModelWithObservability,
} from "@notra/ai/observability";
import { ROUTING_PROMPT } from "@notra/ai/prompts/router";
import { withRouterDefaults } from "@notra/ai/provider-options";
import { routingDecisionSchema } from "@notra/ai/schemas/orchestration";
import type {
  AutoSelection,
  RoutingDecision,
  RoutingResult,
} from "@notra/ai/types/orchestration";
import {
  buildExperimentalTelemetry,
  type TccMetadata,
} from "@notra/ai/utils/tcc";
import { generateObject, generateText } from "ai";

const MODELS = {
  router: "openai/gpt-oss-120b",
  simple: "openai/gpt-5.4-mini",
  complex: "anthropic/claude-sonnet-4.6",
} as const;

const AUTO_POOL = {
  trivial: "anthropic/claude-sonnet-4.6",
  everyday: "anthropic/claude-sonnet-4.6",
  deep: "anthropic/claude-opus-4.8",
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

  const contextHint = hasIntegrationContext
    ? "\n\nNote: The user has connected integration context (for example GitHub or Linear), so they may want help using external project data."
    : "";

  const routerModel = wrapModelWithObservability(
    gateway(MODELS.router, {
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
      system: ROUTING_PROMPT,
      prompt: `Classify this user message:

"${userMessage}"${contextHint}`,
      providerOptions: withRouterDefaults(undefined, {
        modelId: MODELS.router,
      }),
      experimental_repairText: async ({ text, error }) => {
        try {
          const { text: repairedText } = await generateText({
            model: routerModel,
            system:
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
            providerOptions: withRouterDefaults(undefined, {
              modelId: MODELS.router,
            }),
            experimental_telemetry:
              buildExperimentalTelemetry(telemetryMetadata),
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
      experimental_telemetry: buildExperimentalTelemetry(telemetryMetadata),
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

export function selectModel(decision: RoutingDecision): string {
  if (decision.complexity === "complex") {
    return MODELS.complex;
  }
  return MODELS.simple;
}

export async function routeAndSelectModel(
  userMessage: string,
  hasIntegrationContext: boolean,
  log?: AILogTarget,
  hasAttachments = false,
  telemetryMetadata?: TccMetadata
): Promise<RoutingResult> {
  const decision = await routeMessage(
    userMessage,
    hasIntegrationContext,
    log,
    hasAttachments,
    telemetryMetadata
  );
  const model = selectModel(decision);

  return {
    model,
    complexity: decision.complexity,
    requiresTools: decision.requiresTools,
    reasoning: decision.reasoning,
    thinkingLevel: decision.complexity === "complex" ? "medium" : "low",
  };
}
