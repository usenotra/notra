import { and, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";

import { GEO_CHECK_AGGREGATE_CACHE } from "../constants/geo-check-cache";
import { GEO_CHECK_ENGLISH_LANGUAGES } from "../constants/geo-checks";
import { db } from "../drizzle";
import {
  brandSettings,
  geoMentionChecks,
  geoSettings,
  projects,
} from "../schema";
import type {
  GeoAccuracyFactsRow,
  GeoAccuracySampleRow,
} from "../types/geo-accuracy";
import type { GeoCheckScope, GeoCheckWindow } from "../types/geo-checks";
import { parseBrandKnowledgeRecords } from "./brand-knowledge";

function accuracyFilters(scope: GeoCheckScope, window: GeoCheckWindow) {
  return and(
    eq(geoMentionChecks.organizationId, scope.organizationId),
    scope.projectId
      ? eq(geoMentionChecks.projectId, scope.projectId)
      : undefined,
    window.from ? gte(geoMentionChecks.capturedAt, window.from) : undefined,
    window.toExclusive
      ? lt(geoMentionChecks.capturedAt, window.toExclusive)
      : undefined,
    isNull(geoMentionChecks.personaId),
    isNull(geoMentionChecks.sequenceId),
    inArray(geoMentionChecks.language, [...GEO_CHECK_ENGLISH_LANGUAGES]),
    eq(geoMentionChecks.turn, 0),
    eq(geoMentionChecks.mentioned, true)
  );
}

export async function queryGeoAccuracyFacts(
  scope: GeoCheckScope
): Promise<GeoAccuracyFactsRow | null> {
  if (!scope.projectId) {
    return null;
  }
  const [row] = await db
    .select({
      companyName: geoSettings.companyName,
      aliases: geoSettings.aliases,
      brandFacts: brandSettings.knowledgeRecords,
      companyDescription: brandSettings.companyDescription,
    })
    .from(geoSettings)
    .innerJoin(projects, eq(projects.id, geoSettings.projectId))
    .innerJoin(brandSettings, eq(brandSettings.id, projects.brandSettingsId))
    .where(
      and(
        eq(geoSettings.organizationId, scope.organizationId),
        eq(geoSettings.projectId, scope.projectId)
      )
    )
    .limit(1);
  if (!row) {
    return null;
  }
  return {
    companyName: row.companyName,
    aliases: row.aliases,
    brandFacts: parseBrandKnowledgeRecords(row.brandFacts).map((record) => ({
      id: record.id,
      statement: record.statement,
      category: record.category,
      ...(record.sourceUrl ? { sourceUrl: record.sourceUrl } : {}),
    })),
    companyDescription: row.companyDescription,
  };
}

export async function queryGeoAccuracySnapshot(
  scope: GeoCheckScope,
  window: GeoCheckWindow
) {
  const [row] = await db
    .select({
      fingerprint: sql<string>`md5(coalesce(string_agg(md5(jsonb_build_array(${geoMentionChecks.id}, ${geoMentionChecks.answer}, ${geoMentionChecks.prompt}, ${geoMentionChecks.engine}, ${geoMentionChecks.capturedAt})::text), '' order by ${geoMentionChecks.id}), ''))`,
      eligible: sql<number>`count(*)::int`,
    })
    .from(geoMentionChecks)
    .$withCache(GEO_CHECK_AGGREGATE_CACHE)
    .where(accuracyFilters(scope, window));
  if (!row) {
    throw new Error("Accuracy snapshot returned no aggregate");
  }
  return row;
}

export async function queryGeoAccuracySample(
  scope: GeoCheckScope,
  window: GeoCheckWindow,
  limit: number,
  answerChars: number
): Promise<GeoAccuracySampleRow[]> {
  return db
    .select({
      id: geoMentionChecks.id,
      answer: sql<string>`left(${geoMentionChecks.answer}, ${answerChars})`,
      prompt: sql<string>`left(${geoMentionChecks.prompt}, 500)`,
      engine: geoMentionChecks.engine,
      capturedAt: sql<string>`to_char(${geoMentionChecks.capturedAt}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
      sources: geoMentionChecks.sources,
    })
    .from(geoMentionChecks)
    .where(accuracyFilters(scope, window))
    .orderBy(sql`md5(${geoMentionChecks.id})`, geoMentionChecks.id)
    .limit(limit);
}
