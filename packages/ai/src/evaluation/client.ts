import { createGateway } from "@ai-sdk/gateway";
import { APICallError } from "@ai-sdk/provider";
import {
  EVALUATION_DEFAULT_TIMEOUT_MS,
  EVALUATION_DISABLED_VALUES,
  EVALUATION_FLAG_ENV,
  EVALUATION_MODEL_ID,
} from "@notra/ai/constants/evaluation";
import { log } from "@notra/ai/evlog";
import type {
  EvaluateParams,
  EvaluationClient,
  EvaluationClientConfig,
  EvaluationQuestions,
  EvaluationResult,
} from "@notra/ai/types/evaluation";
import { experimental_evaluate as evaluateWithModel } from "ai";

function isFlagEnabled(): boolean {
  const raw = process.env[EVALUATION_FLAG_ENV]?.trim().toLowerCase();
  return !(raw && EVALUATION_DISABLED_VALUES.has(raw));
}

// On Vercel the gateway also authenticates via OIDC without an explicit key.
function hasVercelCredentials(apiKey: string | undefined): boolean {
  return Boolean(
    apiKey || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL === "1"
  );
}

function extractConfidence(
  providerMetadata: Record<string, Record<string, unknown>> | undefined
): Record<string, number> {
  const raw = providerMetadata?.typesafe?.confidence;
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const confidence: Record<string, number> = {};
  for (const [questionId, value] of Object.entries(raw)) {
    if (typeof value === "number") {
      confidence[questionId] = value;
    }
  }
  return confidence;
}

function combineSignals(
  timeoutMs: number,
  abortSignal?: AbortSignal
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return abortSignal ? AbortSignal.any([abortSignal, timeout]) : timeout;
}

/**
 * Evaluation models (typed questions → calibrated answers) via the Vercel AI
 * Gateway. Runs outside the model router: only Vercel serves them, they are
 * ZDR by default, and callers always keep an LLM fallback.
 */
export function createEvaluationClient(
  config: EvaluationClientConfig = {}
): EvaluationClient {
  const apiKey = config.apiKey ?? process.env.AI_GATEWAY_API_KEY?.trim();
  let gateway: ReturnType<typeof createGateway> | undefined;

  const getGateway = (): ReturnType<typeof createGateway> => {
    gateway ??= createGateway({
      apiKey,
      baseURL: config.baseURL,
      headers: config.headers,
      fetch: config.fetch,
    });
    return gateway;
  };

  const isAvailable = (): boolean =>
    config.enabled ?? (isFlagEnabled() && hasVercelCredentials(apiKey));

  const evaluate = async <QUESTIONS extends EvaluationQuestions>(
    params: EvaluateParams<QUESTIONS>
  ): Promise<EvaluationResult<QUESTIONS>> => {
    const modelId = params.modelId ?? EVALUATION_MODEL_ID;
    const startedAt = performance.now();

    const result = await evaluateWithModel({
      model: getGateway().evaluationModel(modelId),
      state: params.state,
      questions: params.questions,
      abortSignal: combineSignals(
        params.timeoutMs ?? EVALUATION_DEFAULT_TIMEOUT_MS,
        params.abortSignal
      ),
      providerOptions: {
        gateway: { zeroDataRetention: true, disallowPromptTraining: true },
      },
    });

    return {
      answers: result.answers,
      confidence: extractConfidence(result.providerMetadata),
      usage: result.usage,
      modelId,
      durationMs: Math.round(performance.now() - startedAt),
    };
  };

  const tryEvaluate = async <QUESTIONS extends EvaluationQuestions>(
    params: EvaluateParams<QUESTIONS>
  ): Promise<EvaluationResult<QUESTIONS> | null> => {
    if (!isAvailable()) {
      return null;
    }
    try {
      return await evaluate(params);
    } catch (error) {
      log.warn({
        event: "ai.evaluation.failed",
        feature: params.feature,
        organizationId: params.organizationId,
        modelId: params.modelId ?? EVALUATION_MODEL_ID,
        status: APICallError.isInstance(error) ? error.statusCode : undefined,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  };

  return { isAvailable, evaluate, tryEvaluate };
}

let defaultClient: EvaluationClient | null = null;

/** Process-wide client built from `AI_GATEWAY_API_KEY` / Vercel OIDC. */
export function getEvaluationClient(): EvaluationClient {
  defaultClient ??= createEvaluationClient();
  return defaultClient;
}

/** Test/ops hook: replace the singleton (pass `null` to rebuild from env). */
export function setEvaluationClient(next: EvaluationClient | null): void {
  defaultClient = next;
}
