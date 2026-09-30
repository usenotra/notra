import type { ModelMessage } from "ai";
import type { Effect } from "effect";
import type { z } from "zod";

import type {
  GeoJudgeError,
  GeoScanError,
  GeoTranslationError,
} from "../geo/errors";
import type { geoSearchConsoleSuggestionSchema } from "../schemas/google-search-console";
import type { GeoModelError } from "../schemas/model-errors";
import type {
  GeoEngineAnswer,
  GeoGroundedAnswer,
  GeoGroundedEngine,
  GeoJudgeResult,
  GeoMentionEvaluation,
  GeoMentionEvaluationInput,
  GeoModelGateway,
  GeoZdrMode,
} from "./geo";
import type { GscSuggestionGenerationParams } from "./google-search-console";

export interface GeoModelServiceShape {
  readonly answer: (input: {
    organizationId: string;
    engine: string;
    prompt: string;
    zdr: GeoZdrMode;
    gateway: Exclude<GeoModelGateway, "cursor" | "box" | "serpapi"> | undefined;
  }) => Effect.Effect<GeoEngineAnswer, GeoScanError>;
  readonly groundedAnswer: (input: {
    organizationId: string;
    engine: GeoGroundedEngine;
    messages: ModelMessage[];
    zdr: GeoZdrMode;
  }) => Effect.Effect<GeoGroundedAnswer, GeoScanError>;
  readonly judge: (input: {
    organizationId: string;
    prompt: string;
  }) => Effect.Effect<GeoJudgeResult, GeoJudgeError>;
  /**
   * Fast typed sentiment/position evaluation. Optional: hosts without the
   * Vercel gateway omit it, and `null` means the call was skipped or failed.
   */
  readonly evaluateMention?: (
    input: GeoMentionEvaluationInput
  ) => Effect.Effect<GeoMentionEvaluation | null>;
  readonly translate: (input: {
    organizationId: string;
    language: string;
    prompts: string[];
  }) => Effect.Effect<
    { translations: string[]; usage?: GeoEngineAnswer["usage"] },
    GeoTranslationError
  >;
  readonly suggest: (input: GscSuggestionGenerationParams) => Effect.Effect<
    {
      prompts: z.infer<typeof geoSearchConsoleSuggestionSchema>["prompts"];
      usage?: GeoEngineAnswer["usage"];
    },
    GeoModelError
  >;
}
