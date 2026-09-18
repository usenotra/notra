import {
  FEEDBACK_CLASSIFIER_FEATURE,
  FEEDBACK_CLASSIFIER_MAX_MESSAGE_CHARS,
  FEEDBACK_CLASSIFIER_MODEL_ID,
  FEEDBACK_CLASSIFIER_REASONING_EFFORT,
  FEEDBACK_CLASSIFIER_TIMEOUT_MS,
} from "@notra/ai/constants/feedback-classifier";
import { getEvaluationClient } from "@notra/ai/evaluation/client";
import { gateway } from "@notra/ai/gateway";
import {
  buildFeedbackEvaluationState,
  mergeFeedbackClassification,
} from "@notra/ai/jobs/feedback-evaluation";
import {
  FEEDBACK_CLASSIFIER_SYSTEM_PROMPT,
  FEEDBACK_EVALUATION_QUESTIONS,
} from "@notra/ai/prompts/feedback-classifier";
import { withRouterDefaults } from "@notra/ai/provider-options";
import { feedbackClassificationSchema } from "@notra/ai/schemas/feedback-classifier";
import type {
  AgentFeedbackClassification,
  ClassifyAgentFeedbackParams,
} from "@notra/ai/types/feedback-classifier";
import { buildTelemetryOptions } from "@notra/ai/utils/tcc";
import { generateText, Output } from "ai";

function buildPrompt(params: ClassifyAgentFeedbackParams): string {
  const lines = [
    params.title ? `Title: ${params.title}` : null,
    params.contextUrl ? `Context URL: ${params.contextUrl}` : null,
    params.agentClient ? `Submitted by: ${params.agentClient}` : null,
    "",
    "Feedback:",
    params.message.slice(0, FEEDBACK_CLASSIFIER_MAX_MESSAGE_CHARS),
  ];
  return lines.filter((line) => line !== null).join("\n");
}

async function generateClassification(
  params: ClassifyAgentFeedbackParams
): Promise<AgentFeedbackClassification | null> {
  try {
    const { output } = await generateText({
      model: gateway(FEEDBACK_CLASSIFIER_MODEL_ID, {
        organizationId: params.organizationId,
      }),
      output: Output.object({ schema: feedbackClassificationSchema }),
      instructions: FEEDBACK_CLASSIFIER_SYSTEM_PROMPT,
      prompt: buildPrompt(params),
      abortSignal: AbortSignal.timeout(FEEDBACK_CLASSIFIER_TIMEOUT_MS),
      providerOptions: withRouterDefaults(
        { openai: { reasoningEffort: FEEDBACK_CLASSIFIER_REASONING_EFFORT } },
        { modelId: FEEDBACK_CLASSIFIER_MODEL_ID }
      ),
      ...buildTelemetryOptions({
        feature: FEEDBACK_CLASSIFIER_FEATURE,
        organizationId: params.organizationId,
        feedbackId: params.feedbackId,
      }),
    });
    return output;
  } catch (error) {
    console.error("[AgentFeedback] Classification failed", {
      organizationId: params.organizationId,
      feedbackId: params.feedbackId,
      error,
    });
    return null;
  }
}

/**
 * Kind and sentiment come from the typed evaluation model; the LLM runs in
 * parallel for the title and covers everything when the evaluation is
 * unavailable.
 */
export async function classifyAgentFeedback(
  params: ClassifyAgentFeedbackParams
): Promise<AgentFeedbackClassification | null> {
  const [evaluation, generated] = await Promise.all([
    getEvaluationClient().tryEvaluate({
      feature: FEEDBACK_CLASSIFIER_FEATURE,
      organizationId: params.organizationId,
      state: buildFeedbackEvaluationState(params),
      questions: FEEDBACK_EVALUATION_QUESTIONS,
      timeoutMs: FEEDBACK_CLASSIFIER_TIMEOUT_MS,
    }),
    generateClassification(params),
  ]);
  return mergeFeedbackClassification(params, evaluation, generated);
}
