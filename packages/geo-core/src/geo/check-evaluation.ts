import { Effect } from "effect";

import { GeoModelService } from "../deps";
import type { GeoCheckContext, GeoEngineAnswer } from "../types/geo";
import { findBrandMention } from "../utils/geo-brand-mention";
import { buildJudgePrompt } from "../utils/geo-check-evaluation";
import { geoLogWarn } from "../utils/geo-log";
import { GeoEmptyAnswerError } from "./errors";

export const judgeAnswer = Effect.fn("geo.judgeAnswer")(function* (
  context: GeoCheckContext,
  promptText: string,
  answer: string
) {
  const models = yield* GeoModelService;
  const judged = yield* models.judge({
    organizationId: context.organizationId,
    prompt: buildJudgePrompt(context, promptText, answer),
  });
  const mentioned =
    findBrandMention(answer, context.companyName, context.aliases) !== null;
  if (judged.mentioned !== mentioned) {
    yield* geoLogWarn({
      event: "geo.check.judge_mention_mismatch",
      organizationId: context.organizationId,
      projectId: context.projectId,
      scanId: context.scanId,
      companyName: context.companyName,
      judgeMentioned: judged.mentioned,
      excerpt: judged.excerpt,
    });
  }
  return {
    ...judged,
    mentioned,
    position: mentioned ? judged.position : null,
    sentiment: mentioned ? judged.sentiment : null,
  };
});

export const requireAnswerText = Effect.fn("geo.requireAnswerText")(function* (
  engine: string,
  promptId: string,
  language: string,
  answer: GeoEngineAnswer
) {
  if (answer.text.trim().length > 0) {
    return answer.text;
  }
  return yield* Effect.fail(
    new GeoEmptyAnswerError({
      message: `Engine ${engine} returned an empty answer`,
      engine,
      promptId,
      language,
      finishReason: answer.finishReason,
      usage: answer.usage,
    })
  );
});
