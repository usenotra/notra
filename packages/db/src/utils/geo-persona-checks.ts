import { and, desc, eq, gte, lt, type SQL, sql } from "drizzle-orm";

import { GEO_PERSONA_SCAN_HISTORY_LIMIT } from "../constants/geo-checks";
import { db } from "../drizzle";
import { geoMentionChecks } from "../schema";
import type { GeoCheckScope } from "../types/geo-checks";
import type {
  GeoCheckPersonaResultRow,
  GeoCheckPersonaScanRow,
} from "../types/geo-persona-checks";
import { parseGeoCheckGrounding } from "./geo-grounding";

function scopeWhere(scope: GeoCheckScope): SQL {
  if (scope.projectId) {
    return and(
      eq(geoMentionChecks.organizationId, scope.organizationId),
      eq(geoMentionChecks.projectId, scope.projectId)
    ) as SQL;
  }
  return eq(geoMentionChecks.organizationId, scope.organizationId);
}

export async function queryGeoCheckPersonaResults(
  scope: GeoCheckScope,
  personaId: string | undefined,
  scanId?: string
): Promise<GeoCheckPersonaResultRow[]> {
  const filters = [
    scopeWhere(scope),
    sql`${geoMentionChecks.personaId} is not null`,
  ];
  if (personaId) {
    filters.push(eq(geoMentionChecks.personaId, personaId));
  }
  if (scanId) {
    filters.push(eq(geoMentionChecks.scanId, scanId));
  }

  const rows = await db
    .selectDistinctOn(
      [
        geoMentionChecks.personaId,
        geoMentionChecks.turn,
        geoMentionChecks.engine,
      ],
      {
        scanId: geoMentionChecks.scanId,
        personaId: geoMentionChecks.personaId,
        personaSnapshot: geoMentionChecks.personaSnapshot,
        turn: geoMentionChecks.turn,
        engine: geoMentionChecks.engine,
        prompt: geoMentionChecks.prompt,
        answer: geoMentionChecks.answer,
        mentioned: geoMentionChecks.mentioned,
        position: geoMentionChecks.position,
        sentiment: geoMentionChecks.sentiment,
        excerpt: geoMentionChecks.excerpt,
        sources: geoMentionChecks.sources,
        grounding: geoMentionChecks.grounding,
        finishReason: geoMentionChecks.finishReason,
        promptTokens: geoMentionChecks.promptTokens,
        outputTokens: geoMentionChecks.outputTokens,
        reasoningTokens: geoMentionChecks.reasoningTokens,
        lastCheckedAt: geoMentionChecks.capturedAt,
      }
    )
    .from(geoMentionChecks)
    .where(and(...filters))
    .orderBy(
      geoMentionChecks.personaId,
      geoMentionChecks.turn,
      geoMentionChecks.engine,
      desc(geoMentionChecks.capturedAt)
    );

  return rows.flatMap((row) => {
    if (!row.personaId) {
      return [];
    }
    return [
      {
        scanId: row.scanId,
        personaId: row.personaId,
        personaSnapshot: row.personaSnapshot,
        turn: row.turn,
        engine: row.engine,
        prompt: row.prompt,
        answer: row.answer,
        mentioned: row.mentioned,
        position: row.position,
        sentiment: row.sentiment,
        excerpt: row.excerpt,
        sources: row.sources,
        grounding: parseGeoCheckGrounding(row.grounding),
        finishReason: row.finishReason,
        promptTokens: row.promptTokens,
        outputTokens: row.outputTokens,
        reasoningTokens: row.reasoningTokens,
        truncated:
          row.finishReason === null ? null : row.finishReason === "length",
        lastCheckedAt: row.lastCheckedAt,
      },
    ];
  });
}

export async function queryGeoCheckPersonaScans(
  scope: GeoCheckScope,
  personaId: string
): Promise<GeoCheckPersonaScanRow[]> {
  return db
    .select({
      scanId: geoMentionChecks.scanId,
      capturedAt: sql`max(${geoMentionChecks.capturedAt})`.mapWith((value) =>
        value instanceof Date ? value : new Date(String(value))
      ),
    })
    .from(geoMentionChecks)
    .where(and(scopeWhere(scope), eq(geoMentionChecks.personaId, personaId)))
    .groupBy(geoMentionChecks.scanId)
    .orderBy(desc(sql`max(${geoMentionChecks.capturedAt})`))
    .limit(GEO_PERSONA_SCAN_HISTORY_LIMIT);
}

export async function queryGeoCheckPersonaActivity(
  scope: GeoCheckScope,
  from: Date,
  to: Date
) {
  const day = sql<string>`to_char(${geoMentionChecks.capturedAt}, 'YYYY-MM-DD')`;
  return db
    .select({
      personaId: geoMentionChecks.personaId,
      day,
      checks: sql<number>`count(*)`.mapWith(Number),
      mentions:
        sql<number>`count(*) filter (where ${geoMentionChecks.mentioned})`.mapWith(
          Number
        ),
    })
    .from(geoMentionChecks)
    .where(
      and(
        scopeWhere(scope),
        sql`${geoMentionChecks.personaId} is not null`,
        gte(geoMentionChecks.capturedAt, from),
        lt(geoMentionChecks.capturedAt, to)
      )
    )
    .groupBy(geoMentionChecks.personaId, day)
    .orderBy(day);
}
