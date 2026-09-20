import { gateway } from "@notra/ai/gateway";
import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  geoCompetitors,
  geoPrompts,
  geoPromptSequences,
  geoSettings,
} from "@notra/db/schema";
import { generateText, Output } from "ai";
import { and, asc, eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_CONVERSATION_CONTEXT_PROMPT_LIMIT,
  GEO_CONVERSATION_GENERATION_MAX_TOKENS,
  GEO_DISCOVERY_MODEL,
  GEO_DISCOVERY_SYSTEM_PROMPT,
  GEO_GENERATED_CONVERSATION_MAX_TURNS,
  GEO_GENERATED_CONVERSATION_MIN_TURNS,
  GEO_GENERATED_CONVERSATION_NAME_MAX_LENGTH,
  GEO_GENERATED_CONVERSATIONS_MAX,
  GEO_MAX_SEQUENCES,
  GEO_PROMPT_MAX_LENGTH,
  GEO_PROMPT_MIN_LENGTH,
} from "../constants/geo";
import { geoConversationGenerationSchema } from "../schemas/geo";
import type { DbTransaction } from "../types/db";
import type {
  GeoConversationGenerationContext,
  GeoGeneratedConversation,
  GeoScopeInput,
  GeoSequencesGenerateResponse,
} from "../types/geo";
import { buildConversationGenerationPrompt } from "../utils/conversation-generation-prompt";
import { geoDb } from "./effect";
import { GeoDiscoveryError } from "./errors";
import { toGeoSequence } from "./mappers";
import { requireGeoProject } from "./projects";
import { buildBrandTerms, promptMentionsBrand } from "./suggestion-keywords";

/**
 * Keeps conversations with enough valid turns. Turns that are out of range or
 * name the brand are dropped rather than failing the whole generation.
 */
export function normalizeGeneratedConversations(
  conversations: readonly GeoGeneratedConversation[],
  brandTerms: string[],
  limit: number
): GeoGeneratedConversation[] {
  const seen = new Set<string>();
  const result: GeoGeneratedConversation[] = [];
  for (const conversation of conversations) {
    if (result.length >= limit) {
      break;
    }
    const name = conversation.name
      .trim()
      .slice(0, GEO_GENERATED_CONVERSATION_NAME_MAX_LENGTH);
    const steps = conversation.steps
      .map((step) => step.trim())
      .filter(
        (step) =>
          step.length >= GEO_PROMPT_MIN_LENGTH &&
          step.length <= GEO_PROMPT_MAX_LENGTH &&
          !promptMentionsBrand(step, brandTerms)
      )
      .slice(0, GEO_GENERATED_CONVERSATION_MAX_TURNS);
    const key = name.toLowerCase();
    if (
      name.length === 0 ||
      seen.has(key) ||
      steps.length < GEO_GENERATED_CONVERSATION_MIN_TURNS
    ) {
      continue;
    }
    seen.add(key);
    result.push({ name, steps });
  }
  return result;
}

/** Adds generated conversations to a project that has none yet. */
export async function insertGeneratedConversationsIfEmpty(
  tx: DbTransaction,
  organizationId: string,
  projectId: string,
  conversations: readonly GeoGeneratedConversation[]
): Promise<number> {
  if (conversations.length === 0) {
    return 0;
  }
  const existing = await tx
    .select({ id: geoPromptSequences.id })
    .from(geoPromptSequences)
    .where(eq(geoPromptSequences.projectId, projectId))
    .limit(1);
  if (existing.length > 0) {
    return 0;
  }
  const rows = await tx
    .insert(geoPromptSequences)
    .values(
      conversations.map((conversation) => ({
        id: crypto.randomUUID(),
        organizationId,
        projectId,
        name: conversation.name,
        steps: conversation.steps,
      }))
    )
    .returning({ id: geoPromptSequences.id });
  return rows.length;
}

export const generateGeoSequences = Effect.fn("geo.sequencesGenerate")(
  function* (input: GeoScopeInput) {
    const scope = yield* requireGeoProject(input);
    const [settings, brand, competitors, prompts, existing] = yield* Effect.all(
      [
        geoDb("settings lookup failed", () =>
          db.query.geoSettings.findFirst({
            columns: { companyName: true, aliases: true },
            where: eq(geoSettings.projectId, scope.projectId),
          })
        ),
        geoDb("brand identity lookup failed", () =>
          db.query.brandSettings.findFirst({
            columns: {
              companyName: true,
              companyDescription: true,
              audience: true,
            },
            where: eq(brandSettings.id, scope.brandSettingsId),
          })
        ),
        geoDb("competitors lookup failed", () =>
          db
            .select({ name: geoCompetitors.name })
            .from(geoCompetitors)
            .where(eq(geoCompetitors.projectId, scope.projectId))
        ),
        geoDb("prompts lookup failed", () =>
          db
            .select({ prompt: geoPrompts.prompt })
            .from(geoPrompts)
            .where(
              and(
                eq(geoPrompts.projectId, scope.projectId),
                eq(geoPrompts.enabled, true)
              )
            )
            .orderBy(asc(geoPrompts.createdAt))
            .limit(GEO_CONVERSATION_CONTEXT_PROMPT_LIMIT)
        ),
        geoDb("sequences lookup failed", () =>
          db
            .select({ name: geoPromptSequences.name })
            .from(geoPromptSequences)
            .where(eq(geoPromptSequences.projectId, scope.projectId))
        ),
      ],
      { concurrency: "unbounded" }
    );

    const room = GEO_MAX_SEQUENCES - existing.length;
    if (room <= 0) {
      return yield* Effect.fail(
        new GeoDiscoveryError({
          message: `You already have ${GEO_MAX_SEQUENCES} conversations. Remove one to generate more.`,
        })
      );
    }

    const companyName =
      settings?.companyName?.trim() ||
      brand?.companyName?.trim() ||
      "the company";
    const context: GeoConversationGenerationContext = {
      companyName,
      companyDescription: brand?.companyDescription ?? null,
      audience: brand?.audience ?? null,
      competitors: competitors.map((row) => row.name),
      prompts: prompts.map((row) => row.prompt),
      existingNames: existing.map((row) => row.name),
      count: Math.min(GEO_GENERATED_CONVERSATIONS_MAX, room),
    };

    const result = yield* Effect.tryPromise({
      try: (signal) =>
        generateText({
          model: gateway(GEO_DISCOVERY_MODEL, {
            organizationId: scope.organizationId,
          }),
          output: Output.object({ schema: geoConversationGenerationSchema }),
          instructions: GEO_DISCOVERY_SYSTEM_PROMPT,
          prompt: buildConversationGenerationPrompt(context),
          maxOutputTokens: GEO_CONVERSATION_GENERATION_MAX_TOKENS,
          abortSignal: signal,
        }),
      catch: (cause) =>
        new GeoDiscoveryError({
          message: "Failed to generate conversations",
          cause,
        }),
    });

    const existingNames = new Set(
      existing.map((row) => row.name.trim().toLowerCase())
    );
    const conversations = normalizeGeneratedConversations(
      result.output.conversations.filter(
        (conversation) =>
          !existingNames.has(conversation.name.trim().toLowerCase())
      ),
      buildBrandTerms({ companyName, aliases: settings?.aliases ?? [] }),
      context.count
    );
    if (conversations.length === 0) {
      return yield* Effect.fail(
        new GeoDiscoveryError({
          message: "Could not generate usable conversations. Try again.",
        })
      );
    }

    const rows = yield* geoDb("sequences insert failed", () =>
      db
        .insert(geoPromptSequences)
        .values(
          conversations.map((conversation) => ({
            id: crypto.randomUUID(),
            organizationId: scope.organizationId,
            projectId: scope.projectId,
            name: conversation.name,
            steps: conversation.steps,
          }))
        )
        .returning()
    );

    const response: GeoSequencesGenerateResponse = {
      sequences: rows.map(toGeoSequence),
    };
    return response;
  }
);
