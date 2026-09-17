import type { Experimental_EvaluationModelV4Input } from "@ai-sdk/provider";
import type {
  Experimental_EvaluationQuestion,
  Experimental_EvaluationResult,
} from "ai";

/** Instructions, criteria and state accept plain strings or JSON structure. */
export type EvaluationInput = Experimental_EvaluationModelV4Input;

export type EvaluationQuestion = Experimental_EvaluationQuestion;

export type EvaluationQuestions = Readonly<Record<string, EvaluationQuestion>>;

export type EvaluationAnswers<QUESTIONS extends EvaluationQuestions> =
  Experimental_EvaluationResult<QUESTIONS>["answers"];

export interface EvaluationResult<QUESTIONS extends EvaluationQuestions> {
  readonly answers: EvaluationAnswers<QUESTIONS>;
  /** Per-question confidence in the selected option, when the model reports it. */
  readonly confidence: Readonly<Record<string, number>>;
  readonly usage: Experimental_EvaluationResult<QUESTIONS>["usage"];
  readonly modelId: string;
  readonly durationMs: number;
}

export interface EvaluateParams<QUESTIONS extends EvaluationQuestions> {
  state: EvaluationInput;
  questions: QUESTIONS;
  /** Name of the calling feature, for logs. */
  feature: string;
  organizationId?: string;
  abortSignal?: AbortSignal;
  timeoutMs?: number;
  modelId?: string;
}

export interface EvaluationClientConfig {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
  /** Overrides the env-derived availability check (tests). */
  enabled?: boolean;
}

export interface EvaluationClient {
  /** True when the flag is on and Vercel gateway credentials exist. */
  isAvailable(): boolean;
  /** Rejects with the SDK's gateway error on transport, auth or schema failures. */
  evaluate<QUESTIONS extends EvaluationQuestions>(
    params: EvaluateParams<QUESTIONS>
  ): Promise<EvaluationResult<QUESTIONS>>;
  /** Logs and returns `null` instead of throwing; `null` when unavailable. */
  tryEvaluate<QUESTIONS extends EvaluationQuestions>(
    params: EvaluateParams<QUESTIONS>
  ): Promise<EvaluationResult<QUESTIONS> | null>;
}
