import { FEEDBACK_CLASSIFIER_MAX_MESSAGE_CHARS } from "@notra/ai/constants/feedback-classifier";
import { FEEDBACK_EVALUATION_QUESTIONS } from "@notra/ai/prompts/feedback-classifier";
import type { EvaluationResult } from "@notra/ai/types/evaluation";
import type {
  AgentFeedbackClassification,
  ClassifyAgentFeedbackParams,
} from "@notra/ai/types/feedback-classifier";
import { fallbackFeedbackTitle } from "@notra/ai/utils/feedback-title";

export type FeedbackEvaluation = EvaluationResult<
  typeof FEEDBACK_EVALUATION_QUESTIONS
>;

export function buildFeedbackEvaluationState(
  params: ClassifyAgentFeedbackParams
) {
  return {
    title: params.title ?? null,
    contextUrl: params.contextUrl ?? null,
    submittedBy: params.agentClient ?? null,
    feedback: params.message.slice(0, FEEDBACK_CLASSIFIER_MAX_MESSAGE_CHARS),
  };
}

/**
 * Typed answers win for kind and sentiment; the LLM only contributes the
 * title. Either half may be missing when its call failed.
 */
export function mergeFeedbackClassification(
  params: ClassifyAgentFeedbackParams,
  evaluation: FeedbackEvaluation | null,
  generated: AgentFeedbackClassification | null
): AgentFeedbackClassification | null {
  if (!evaluation) {
    return generated;
  }
  return {
    kind: evaluation.answers.kind.choice,
    sentiment: evaluation.answers.sentiment.choice,
    title:
      generated?.title ?? fallbackFeedbackTitle(params.message, params.title),
  };
}
