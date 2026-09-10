import { db } from "@notra/db/drizzle";
import { geoPrompts, geoPromptSuggestions } from "@notra/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { Effect } from "effect";

import { GeoSuggestionNotFoundError } from "../schemas/suggestion-errors";
import type { DbTransaction } from "../types/db";
import type { GeoScopeInput } from "../types/geo";
import type {
  GeoSuggestionInput,
  GeoSuggestionRow,
} from "../types/suggestions";
import { geoDb } from "./effect";
import { GeoDatabaseError } from "./errors";
import { lockGeoProjectInTransaction } from "./lock";
import { toTrackedPrompt } from "./mappers";
import { requireGeoProject } from "./projects";
import { promptKey } from "./prompt-key";

export const listSuggestions = Effect.fn("geo.suggestions.list")(function* (
  input: GeoScopeInput
) {
  const rows = yield* geoDb("list suggestions", () =>
    db.query.geoPromptSuggestions.findMany({
      where: and(
        eq(geoPromptSuggestions.organizationId, input.organizationId),
        eq(geoPromptSuggestions.status, "pending")
      ),
      orderBy: [desc(geoPromptSuggestions.createdAt)],
    })
  );
  return {
    suggestions: rows.map((row) => ({
      id: row.id,
      prompt: row.prompt,
      source: row.source,
      keywords: row.sourceKeywords,
      createdAt: row.createdAt.toISOString(),
    })),
  };
});

/** SQL-only transaction adapter. Project lock serializes normalized prompt reuse. */
async function acceptSuggestionInTx(
  tx: DbTransaction,
  organizationId: string,
  projectId: string,
  suggestion: GeoSuggestionRow
) {
  const existing = await tx.query.geoPrompts.findFirst({
    where: and(
      eq(geoPrompts.organizationId, organizationId),
      eq(geoPrompts.projectId, projectId),
      sql`lower(trim(${geoPrompts.prompt})) = ${promptKey(suggestion.prompt)}`
    ),
  });
  const prompt =
    existing ??
    (
      await tx
        .insert(geoPrompts)
        .values({
          id: crypto.randomUUID(),
          organizationId,
          projectId,
          prompt: suggestion.prompt,
          title: suggestion.title,
        })
        .returning()
    )[0];
  if (!prompt) {
    throw new Error("Failed to create suggestion prompt");
  }
  await tx
    .update(geoPromptSuggestions)
    .set({ status: "accepted", acceptedPromptId: prompt.id })
    .where(
      and(
        eq(geoPromptSuggestions.id, suggestion.id),
        eq(geoPromptSuggestions.organizationId, organizationId),
        eq(geoPromptSuggestions.status, "pending")
      )
    );
  return toTrackedPrompt(prompt);
}

export const acceptSuggestion = Effect.fn("geo.suggestions.accept")(function* (
  input: GeoSuggestionInput
) {
  const { projectId } = yield* requireGeoProject(input);
  return yield* Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        await lockGeoProjectInTransaction(tx, projectId);
        // Read pending state under a row lock, so dismiss/accept cannot both win.
        const [suggestion] = await tx
          .select()
          .from(geoPromptSuggestions)
          .where(
            and(
              eq(geoPromptSuggestions.id, input.suggestionId),
              eq(geoPromptSuggestions.organizationId, input.organizationId),
              eq(geoPromptSuggestions.status, "pending")
            )
          )
          .for("update");
        if (!suggestion) {
          throw new GeoSuggestionNotFoundError({
            suggestionId: input.suggestionId,
          });
        }
        const prompt = await acceptSuggestionInTx(
          tx,
          input.organizationId,
          projectId,
          suggestion
        );
        return { projectId, prompt, suggestion };
      }),
    catch: (cause) =>
      cause instanceof GeoSuggestionNotFoundError
        ? cause
        : new GeoDatabaseError({ label: "accept suggestion", cause }),
  });
});

export const acceptAllSuggestions = Effect.fn("geo.suggestions.acceptAll")(
  function* (input: GeoScopeInput) {
    const pending = yield* geoDb("check pending suggestions", () =>
      db.query.geoPromptSuggestions.findFirst({
        columns: { id: true },
        where: and(
          eq(geoPromptSuggestions.organizationId, input.organizationId),
          eq(geoPromptSuggestions.status, "pending")
        ),
      })
    );
    if (!pending) {
      return { projectId: input.projectId, suggestions: [], accepted: 0 };
    }
    const { projectId } = yield* requireGeoProject(input);
    return yield* geoDb("accept all suggestions", () =>
      db.transaction(async (tx) => {
        await lockGeoProjectInTransaction(tx, projectId);
        const suggestions = await tx
          .select()
          .from(geoPromptSuggestions)
          .where(
            and(
              eq(geoPromptSuggestions.organizationId, input.organizationId),
              eq(geoPromptSuggestions.status, "pending")
            )
          )
          .orderBy(
            asc(geoPromptSuggestions.createdAt),
            asc(geoPromptSuggestions.id)
          )
          .for("update");
        for (const row of suggestions) {
          await acceptSuggestionInTx(tx, input.organizationId, projectId, row);
        }
        return { projectId, suggestions, accepted: suggestions.length };
      })
    );
  }
);

export const dismissSuggestion = Effect.fn("geo.suggestions.dismiss")(
  function* (input: GeoSuggestionInput) {
    const [row] = yield* geoDb("dismiss suggestion", () =>
      db
        .update(geoPromptSuggestions)
        .set({ status: "dismissed" })
        .where(
          and(
            eq(geoPromptSuggestions.id, input.suggestionId),
            eq(geoPromptSuggestions.organizationId, input.organizationId),
            eq(geoPromptSuggestions.status, "pending")
          )
        )
        .returning({ id: geoPromptSuggestions.id })
    );
    if (!row) {
      return yield* Effect.fail(
        new GeoSuggestionNotFoundError({ suggestionId: input.suggestionId })
      );
    }
    return { dismissed: true, suggestionId: row.id };
  }
);
