import type { Experimental_EvaluationQuestion } from "ai";

import { JEV_MODEL_ID } from "../constants/contenders";
import { callJev } from "../models/gateway";

export interface JudgeVerdict {
  /** question id → probability (boolean) or normalized score 0..1 (score/choice). */
  readonly values: Record<string, number>;
  readonly costUsd: number;
}

type Questions = Readonly<Record<string, Experimental_EvaluationQuestion>>;

function hash(text: string): number {
  let value = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16_777_619);
  }
  return value >>> 0;
}

/** Stable fake verdict for demo runs, skewed by `quality` (0..1). */
function demoVerdict(
  questions: Questions,
  seedText: string,
  quality: number
): JudgeVerdict {
  const values: Record<string, number> = {};
  for (const id of Object.keys(questions)) {
    const noise = (hash(`${id}:${seedText}`) % 1000) / 1000;
    values[id] = Math.max(0, Math.min(1, quality * 0.8 + noise * 0.35));
  }
  return { values, costUsd: 0 };
}

/**
 * Jev as an LLM-judge replacement: typed questions in, calibrated
 * probabilities out, ~300 ms and a fraction of a cent per call.
 */
export async function judgeWithJev(params: {
  feature: string;
  state: Record<string, unknown>;
  questions: Questions;
  abortSignal: AbortSignal;
  demo: boolean;
  /** Only used in demo mode. */
  demoQuality?: number;
}): Promise<JudgeVerdict> {
  if (params.demo) {
    return demoVerdict(
      params.questions,
      JSON.stringify(params.state),
      params.demoQuality ?? 0.8
    );
  }
  const result = await callJev({
    modelId: JEV_MODEL_ID,
    feature: params.feature,
    state: params.state as never,
    questions: params.questions,
    abortSignal: AbortSignal.any([
      params.abortSignal,
      AbortSignal.timeout(15_000),
    ]),
  });

  const values: Record<string, number> = {};
  for (const [id, answer] of Object.entries(result.output.answers) as [
    string,
    { type: string; probability?: number; score?: number; choice?: string },
  ][]) {
    const question = params.questions[id];
    if (answer.type === "boolean") {
      values[id] = answer.probability ?? 0;
    } else if (answer.type === "score" && question?.type === "score") {
      values[id] =
        (answer.score ?? 0) / Math.max(1, question.criteria.length - 1);
    } else if (answer.type === "choice" && question?.type === "choice") {
      const keys = Object.keys(question.criteria);
      values[id] =
        keys.indexOf(answer.choice ?? "") / Math.max(1, keys.length - 1);
    }
  }
  return { values, costUsd: result.costUsd ?? 0 };
}
