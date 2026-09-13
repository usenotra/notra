import { db } from "@notra/db/drizzle";
import { geoPromptSequences } from "@notra/db/schema";
import { queryGeoCheckSequenceResults } from "@notra/db/utils/geo-checks";
import { and, asc, eq } from "drizzle-orm";
import { Effect } from "effect";

import type {
  GeoScopeInput,
  GeoSequenceCreateInput,
  GeoSequenceResultsResponse,
  GeoSequencesResponse,
  GeoSequenceUpdateInput,
} from "../types/geo";
import { geoAnswerSourcesFor } from "../utils/geo-answer-sources";
import { geoDb } from "./effect";
import {
  GeoSequenceCreateFailedError,
  GeoSequenceNotFoundError,
} from "./errors";
import { toGeoSequence } from "./mappers";
import { geoCheckScope, requireGeoProject, resolveGeoScope } from "./projects";

export const listGeoSequences = Effect.fn("geo.sequencesList")(function* (
  input: GeoScopeInput
) {
  const scope = yield* resolveGeoScope(input);
  if (!scope.projectId) {
    const emptyResponse: GeoSequencesResponse = { sequences: [] };
    return emptyResponse;
  }

  const projectId = scope.projectId;
  const rows = yield* geoDb("sequences lookup failed", () =>
    db.query.geoPromptSequences.findMany({
      where: eq(geoPromptSequences.projectId, projectId),
      orderBy: [asc(geoPromptSequences.createdAt)],
    })
  );

  const response: GeoSequencesResponse = {
    sequences: rows.map(toGeoSequence),
  };
  return response;
});

export const createGeoSequence = Effect.fn("geo.sequenceCreate")(function* (
  input: GeoScopeInput,
  sequence: GeoSequenceCreateInput
) {
  const scope = yield* requireGeoProject(input);
  const rows = yield* geoDb("sequence create failed", () =>
    db
      .insert(geoPromptSequences)
      .values({
        id: sequence.id ?? crypto.randomUUID(),
        organizationId: scope.organizationId,
        projectId: scope.projectId,
        name: sequence.name,
        steps: sequence.steps,
      })
      .returning()
  );

  const row = rows.at(0);
  if (!row) {
    return yield* Effect.fail(new GeoSequenceCreateFailedError({}));
  }

  return toGeoSequence(row);
});

export const updateGeoSequence = Effect.fn("geo.sequenceUpdate")(function* (
  input: GeoScopeInput,
  update: GeoSequenceUpdateInput
) {
  const scope = yield* requireGeoProject(input);
  const rows = yield* geoDb("sequence update failed", () =>
    db
      .update(geoPromptSequences)
      .set({
        ...(update.name === undefined ? {} : { name: update.name }),
        ...(update.steps === undefined ? {} : { steps: update.steps }),
        ...(update.enabled === undefined ? {} : { enabled: update.enabled }),
      })
      .where(
        and(
          eq(geoPromptSequences.id, update.sequenceId),
          eq(geoPromptSequences.organizationId, scope.organizationId),
          eq(geoPromptSequences.projectId, scope.projectId)
        )
      )
      .returning()
  );

  const row = rows.at(0);
  if (!row) {
    return yield* Effect.fail(
      new GeoSequenceNotFoundError({ sequenceId: update.sequenceId })
    );
  }

  return toGeoSequence(row);
});

export const deleteGeoSequence = Effect.fn("geo.sequenceDelete")(function* (
  input: GeoScopeInput,
  sequenceId: string
) {
  const scope = yield* requireGeoProject(input);
  const rows = yield* geoDb("sequence delete failed", () =>
    db
      .delete(geoPromptSequences)
      .where(
        and(
          eq(geoPromptSequences.id, sequenceId),
          eq(geoPromptSequences.organizationId, scope.organizationId),
          eq(geoPromptSequences.projectId, scope.projectId)
        )
      )
      .returning()
  );

  if (!rows.at(0)) {
    return yield* Effect.fail(new GeoSequenceNotFoundError({ sequenceId }));
  }

  return { success: true };
});

export const loadGeoSequenceResults = Effect.fn("geo.sequenceResults")(
  function* (input: GeoScopeInput, sequenceId: string | undefined) {
    const scope = yield* resolveGeoScope(input);
    const rows = yield* geoDb("sequence results query failed", () =>
      queryGeoCheckSequenceResults(geoCheckScope(scope), sequenceId)
    );

    const response: GeoSequenceResultsResponse = {
      configured: true,
      results: rows.map((row) => ({
        sequenceId: row.sequenceId,
        turn: row.turn,
        engine: row.engine,
        prompt: row.prompt,
        answer: row.answer,
        mentioned: row.mentioned,
        ownedSourceCited: row.ownedSourceCited,
        position: row.position,
        sentiment: row.sentiment,
        excerpt: row.excerpt,
        searchQueries: row.grounding.queries,
        sources: geoAnswerSourcesFor(row.grounding, row.sources),
        finishReason: row.finishReason,
        promptTokens: row.promptTokens,
        outputTokens: row.outputTokens,
        reasoningTokens: row.reasoningTokens,
        truncated: row.truncated,
        lastCheckedAt: row.lastCheckedAt.toISOString(),
      })),
    };
    return response;
  }
);
