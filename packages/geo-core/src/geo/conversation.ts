import { DEFAULT_LANGUAGE } from "@notra/ai/constants/languages";
import type { GeoCheckWrite } from "@notra/db/types/geo-checks";
import type { ModelMessage } from "ai";
import { Effect } from "effect";

import { GEO_EXCERPT_MAX_LENGTH } from "../constants/geo";
import { MAX_JUDGE_COMPETITORS } from "../constants/geo-conversations";
import { GeoModelService } from "../deps";
import type {
  GeoCheckContext,
  GeoGroundedEngine,
  GeoSkipFields,
  GeoZdrMode,
} from "../types/geo";
import type {
  GeoConversationOutcome,
  GeoConversationSource,
} from "../types/geo-conversations";
import { normalizePosition } from "../utils/geo-check-evaluation";
import { geoLogWarn, logGeoSkip } from "../utils/geo-log";
import { hasOwnedSourceCitation } from "../utils/geo-owned-source";
import {
  addAgentTokenUsage,
  EMPTY_AGENT_TOKEN_USAGE,
} from "../utils/token-usage";
import { judgeAnswer, requireAnswerText } from "./check-evaluation";
import { GeoScanError } from "./errors";

/** Owns the transcript, deadline and partial results for both kinds of conversation. */
export const runGeoConversation = Effect.fn("geo.runConversation")(function* (
  context: GeoCheckContext,
  source: GeoConversationSource,
  engine: GeoGroundedEngine,
  zdr: GeoZdrMode
) {
  const models = yield* GeoModelService;
  const rows: GeoCheckWrite[] = [];
  const messages: ModelMessage[] = [];
  let usage = EMPTY_AGENT_TOKEN_USAGE;
  const fields: GeoSkipFields = {
    event: "geo.check.failed",
    organizationId: context.organizationId,
    projectId: context.projectId,
    scanId: context.scanId,
    runId: context.runId,
    promptId: source.promptId,
    personaId: source.personaId,
    sequenceId: source.sequenceId,
    engine: engine.key,
    grounded: true,
  };

  const play = Effect.gen(function* () {
    for (const [index, prompt] of source.prompts.entries()) {
      messages.push({ role: "user", content: prompt });
      const answer = yield* models.groundedAnswer({
        organizationId: context.organizationId,
        engine,
        messages,
        zdr,
      });
      usage = addAgentTokenUsage(usage, answer.usage);
      if (zdr !== "none" && answer.zdrEnforced === false) {
        yield* geoLogWarn({
          ...fields,
          event: "geo.check.zdr_relaxed",
          turn: index + 1,
          zdr,
        });
      }
      const text = yield* requireAnswerText(
        engine.key,
        source.promptId,
        DEFAULT_LANGUAGE,
        answer
      );
      messages.push({ role: "assistant", content: text });
      const judged = yield* judgeAnswer(context, prompt, text);
      rows.push({
        organizationId: context.organizationId,
        projectId: context.projectId,
        scanId: context.scanId,
        engine: engine.key,
        promptId: source.promptId,
        sequenceId: source.sequenceId ?? null,
        personaId: source.personaId ?? null,
        personaSnapshot: source.snapshot ?? null,
        turn: index + 1,
        prompt,
        answer: text,
        capturedAt: context.capturedAt,
        mentioned: judged.mentioned,
        ownedSourceCited: hasOwnedSourceCitation(
          context.websiteUrl,
          [...answer.grounding.sources, ...answer.sources],
          context.domains
        ),
        position: normalizePosition(judged.position),
        sentiment: judged.sentiment,
        competitors: judged.competitors.slice(0, MAX_JUDGE_COMPETITORS),
        excerpt: judged.excerpt.slice(0, GEO_EXCERPT_MAX_LENGTH),
        grounding: answer.grounding,
        finishReason: answer.finishReason,
        promptTokens: answer.usage.inputTokens ?? null,
        outputTokens: answer.usage.outputTokens ?? null,
        reasoningTokens: answer.usage.reasoningTokens ?? null,
        zdrEnforced: answer.zdrEnforced,
        language: DEFAULT_LANGUAGE,
        sources: answer.sources,
      });
    }
  });
  yield* play.pipe(
    Effect.timeoutOrElse({
      duration: source.timeoutMs,
      orElse: () =>
        Effect.fail(
          new GeoScanError({
            message: `Conversation ${source.promptId} on ${engine.key} timed out`,
          })
        ),
    }),
    Effect.catch((error) =>
      Effect.sync(() =>
        logGeoSkip(
          "conversation stopped after a failed turn",
          { ...fields, turn: rows.length + 1 },
          error
        )
      )
    )
  );
  const outcome: GeoConversationOutcome = {
    rows,
    usage,
    droppedTurns: source.prompts.length - rows.length,
  };
  return outcome;
});
