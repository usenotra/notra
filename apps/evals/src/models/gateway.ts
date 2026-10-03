import { createGateway } from "@ai-sdk/gateway";
import {
  experimental_evaluate as evaluateWithModel,
  generateText,
  Output,
  type Experimental_EvaluationQuestion,
  type ModelMessage,
} from "ai";
import type { z } from "zod";

import { PROD_GATEWAY_CACHING } from "../constants/gateway";
import type { CallResult, TokenUsage } from "../types/eval";
import { priceFor } from "./pricing";

let gatewayInstance: ReturnType<typeof createGateway> | undefined;

export function getGateway(): ReturnType<typeof createGateway> {
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "AI_GATEWAY_API_KEY is missing. Run from the repo root .env or use --demo."
    );
  }
  gatewayInstance ??= createGateway({
    apiKey,
    headers: {
      "http-referer": "https://www.usenotra.com",
      "x-title": "Notra evals",
    },
  });
  return gatewayInstance;
}

// Same tags as prod calls so eval spend is visible separately in the gateway.
const gatewayProviderOptions = (feature: string) => ({
  gateway: {
    disallowPromptTraining: true,
    tags: [`eval-${feature}`],
    caching: PROD_GATEWAY_CACHING,
  },
});

interface UsageLike {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  inputTokenDetails?: { cacheReadTokens?: number | undefined } | undefined;
}

export function toUsage(usage: UsageLike | undefined): TokenUsage {
  return {
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cachedInputTokens: usage?.inputTokenDetails?.cacheReadTokens ?? 0,
  };
}

/** Gateway cost, falling back to market cost (BYOK calls report cost 0). */
function readGatewayCost(metadata: unknown): number | undefined {
  const gateway = (
    metadata as { gateway?: Record<string, unknown> } | undefined
  )?.gateway;
  for (const key of ["cost", "marketCost"] as const) {
    const raw = gateway?.[key];
    const value = typeof raw === "string" ? Number(raw) : raw;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return undefined;
}

/** List-price estimate for calls without a gateway-reported cost. */
async function estimateCost(
  modelId: string,
  usage: TokenUsage
): Promise<number> {
  const price = await priceFor(modelId);
  if (!price) {
    return 0;
  }
  const uncached = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  // Cache reads bill at roughly a tenth of the input price across providers.
  return (
    uncached * price.input +
    usage.cachedInputTokens * price.input * 0.1 +
    usage.outputTokens * price.output
  );
}

/**
 * Agent loops: the gateway reports cost per step, so sum the steps. Falls back
 * to the list-price estimate if any step lacks a reported cost.
 */
export async function runCost(
  modelId: string,
  usage: TokenUsage,
  steps: readonly { providerMetadata?: unknown }[]
): Promise<number> {
  let total = 0;
  for (const step of steps) {
    const cost = readGatewayCost(step.providerMetadata);
    if (cost === undefined) {
      return estimateCost(modelId, usage);
    }
    total += cost;
  }
  return total;
}

async function costFor(
  modelId: string,
  usage: TokenUsage,
  metadata: unknown
): Promise<number> {
  const reported = readGatewayCost(metadata);
  if (reported !== undefined) {
    return reported;
  }
  return estimateCost(modelId, usage);
}

export interface ObjectCallParams<SCHEMA extends z.ZodType> {
  modelId: string;
  feature: string;
  schema: SCHEMA;
  system?: string;
  prompt?: string;
  messages?: ModelMessage[];
  abortSignal: AbortSignal;
  temperature?: number;
  providerOptions?: Record<string, Record<string, unknown>>;
}

export async function callObject<SCHEMA extends z.ZodType>(
  params: ObjectCallParams<SCHEMA>
): Promise<CallResult<z.infer<SCHEMA>>> {
  const result = await generateText({
    model: getGateway()(params.modelId),
    system: params.system,
    messages: params.messages ?? [
      { role: "user", content: params.prompt ?? "" },
    ],
    output: Output.object({ schema: params.schema }),
    abortSignal: params.abortSignal,
    temperature: params.temperature,
    maxRetries: 0,
    providerOptions: {
      ...gatewayProviderOptions(params.feature),
      ...params.providerOptions,
    },
  });

  const usage = toUsage(result.totalUsage);
  return {
    output: result.output as z.infer<SCHEMA>,
    usage,
    costUsd: await costFor(params.modelId, usage, result.providerMetadata),
    transcript: result.text,
  };
}

export type JevQuestions = Readonly<
  Record<string, Experimental_EvaluationQuestion>
>;

export interface JevCallParams<QUESTIONS extends JevQuestions> {
  modelId: string;
  feature: string;
  state: Parameters<typeof evaluateWithModel>[0]["state"];
  questions: QUESTIONS;
  abortSignal: AbortSignal;
}

export interface JevAnswer<QUESTIONS extends JevQuestions> {
  answers: Awaited<ReturnType<typeof evaluateWithModel<QUESTIONS>>>["answers"];
  confidence: Record<string, number>;
}

/** Same call shape as packages/ai/src/evaluation/client.ts. */
export async function callJev<QUESTIONS extends JevQuestions>(
  params: JevCallParams<QUESTIONS>
): Promise<CallResult<JevAnswer<QUESTIONS>>> {
  const result = await evaluateWithModel({
    model: getGateway().evaluationModel(params.modelId),
    state: params.state,
    questions: params.questions,
    abortSignal: params.abortSignal,
    providerOptions: {
      gateway: {
        zeroDataRetention: true,
        disallowPromptTraining: true,
        tags: [`eval-${params.feature}`],
      },
    },
  });

  const confidence: Record<string, number> = {};
  const raw = (
    result.providerMetadata as
      | Record<string, Record<string, unknown>>
      | undefined
  )?.typesafe?.confidence;
  if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === "number") {
        confidence[key] = value;
      }
    }
  }

  const usage = toUsage(result.usage as UsageLike);
  return {
    output: { answers: result.answers, confidence },
    usage,
    costUsd: await costFor(params.modelId, usage, result.providerMetadata),
    transcript: JSON.stringify(
      { answers: result.answers, confidence },
      null,
      2
    ),
  };
}
