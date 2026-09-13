import { GEO_TOOL_DEFAULT_COMPETITOR_LIMIT } from "@notra/ai/constants/geo-tools";
import {
  GEO_CONTEXT_LOOKBACK_DAYS,
  GEO_CONTEXT_MAX_ANSWER_CHARS,
  GEO_CONTEXT_MAX_CHECKS,
  GEO_CONTEXT_MAX_EXCERPT_CHARS,
} from "@notra/ai/constants/geo-writer";
import {
  buildGeoCompetitorShareChart,
  buildGeoOverviewChart,
  buildGeoTimeseriesChart,
} from "@notra/ai/utils/chart-artifact";
import { GEO_CHECK_ENGLISH_LANGUAGES } from "@notra/db/constants/geo-checks";
import { db } from "@notra/db/drizzle";
import {
  geoCompetitors,
  geoMentionChecks,
  geoPrompts,
  geoSettings,
  projects,
} from "@notra/db/schema";
import {
  queryGeoCheckCompetitorShare,
  queryGeoCheckOverview,
  queryGeoCheckPromptResults,
  queryGeoCheckTimeseries,
  toGeoCheckWindow,
} from "@notra/db/utils/geo-checks";
import { and, asc, desc, eq, gte, inArray, isNull } from "drizzle-orm";

const MS_PER_DAY = 86_400_000;

const mentionCheckBaseColumns = {
  promptId: geoMentionChecks.promptId,
  engine: geoMentionChecks.engine,
  prompt: geoMentionChecks.prompt,
  mentioned: geoMentionChecks.mentioned,
  position: geoMentionChecks.position,
  sentiment: geoMentionChecks.sentiment,
  competitors: geoMentionChecks.competitors,
  excerpt: geoMentionChecks.excerpt,
  capturedAt: geoMentionChecks.capturedAt,
};

function geoScope(organizationId: string, projectId?: string) {
  return { organizationId, projectId: projectId ?? null };
}

export async function loadGeoProjectsForTool(organizationId: string) {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      isSample: projects.isSample,
      companyName: geoSettings.companyName,
      trackingEnabled: geoSettings.enabled,
      lastScanAt: geoSettings.lastScanAt,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .leftJoin(
      geoSettings,
      and(
        eq(geoSettings.projectId, projects.id),
        eq(geoSettings.organizationId, organizationId)
      )
    )
    .where(eq(projects.organizationId, organizationId))
    .orderBy(asc(projects.createdAt));

  return {
    projects: rows.map((row) => ({
      id: row.id,
      name: row.name,
      is_sample: row.isSample,
      company_name: row.companyName,
      tracking_enabled: row.trackingEnabled,
      last_scan_at: row.lastScanAt?.toISOString() ?? null,
      created_at: row.createdAt.toISOString(),
    })),
    count: rows.length,
  };
}

export async function loadGeoOverviewForTool(
  organizationId: string,
  projectId: string | undefined,
  days: number
) {
  const scope = geoScope(organizationId, projectId);
  const window = toGeoCheckWindow({ days });
  const [overview, competitors] = await Promise.all([
    queryGeoCheckOverview(scope, window),
    queryGeoCheckCompetitorShare(
      scope,
      window,
      GEO_TOOL_DEFAULT_COMPETITOR_LIMIT,
      { sequences: "single", englishOnly: true }
    ),
  ]);

  const engines = overview.map((row) => ({
    engine: row.engine,
    checks: row.checks,
    mentions: row.mentions,
    mention_rate: row.mentionRate,
    citations: row.citations,
    visibility: row.visibility,
    visibility_rate: row.visibilityRate,
    avg_position: row.avgPosition,
    last_checked_at: row.lastCheckedAt.toISOString(),
  }));

  return {
    project_id: scope.projectId,
    days,
    engines,
    competitor_share: competitors.map((row) => ({
      brand: row.brand,
      mentions: row.mentions,
    })),
    chart: buildGeoOverviewChart({
      days,
      engines,
    }),
  };
}

export async function loadGeoTimeseriesForTool(
  organizationId: string,
  projectId: string | undefined,
  days: number
) {
  const scope = geoScope(organizationId, projectId);
  const rows = await queryGeoCheckTimeseries(
    scope,
    toGeoCheckWindow({ days }),
    {
      sequences: "single",
      englishOnly: true,
    }
  );

  const points = rows.map((row) => ({
    day: row.day,
    engine: row.engine,
    checks: row.checks,
    mentions: row.mentions,
    citations: row.citations,
    visibility: row.visibility,
    mention_rate:
      row.checks === 0
        ? 0
        : Math.round((row.mentions / row.checks) * 1000) / 1000,
    visibility_rate:
      row.checks === 0
        ? 0
        : Math.round((row.visibility / row.checks) * 1000) / 1000,
    avg_position: row.avgPosition,
  }));

  return {
    project_id: scope.projectId,
    days,
    points,
    chart: buildGeoTimeseriesChart({ days, points }),
  };
}

export async function loadGeoPromptResultsForTool(
  organizationId: string,
  projectId: string | undefined,
  days: number,
  limit: number,
  includeAnswers: boolean
) {
  const scope = geoScope(organizationId, projectId);
  const rows = await queryGeoCheckPromptResults(
    scope,
    toGeoCheckWindow({ days }),
    limit + 1
  );
  const results = rows.slice(0, limit).map((row) => {
    const base = {
      prompt_id: row.promptId,
      prompt: row.prompt,
      engine: row.engine,
      mentioned: row.mentioned,
      position: row.position,
      sentiment: row.sentiment,
      truncated: row.truncated,
      last_checked_at: row.lastCheckedAt.toISOString(),
    };
    return includeAnswers
      ? {
          ...base,
          answer: row.answer.slice(0, GEO_CONTEXT_MAX_ANSWER_CHARS),
        }
      : {
          ...base,
          excerpt: row.excerpt.slice(0, GEO_CONTEXT_MAX_EXCERPT_CHARS),
        };
  });

  return {
    project_id: scope.projectId,
    days,
    results,
    count: results.length,
    has_more: rows.length > limit,
  };
}

export async function loadGeoCompetitorShareForTool(
  organizationId: string,
  projectId: string | undefined,
  days: number,
  limit: number
) {
  const scope = geoScope(organizationId, projectId);
  const competitors = await queryGeoCheckCompetitorShare(
    scope,
    toGeoCheckWindow({ days }),
    limit,
    { sequences: "single", englishOnly: true }
  );

  const competitorRows = competitors.map((row) => ({
    brand: row.brand,
    mentions: row.mentions,
  }));

  return {
    project_id: scope.projectId,
    days,
    competitors: competitorRows,
    chart: buildGeoCompetitorShareChart({
      days,
      competitors: competitorRows,
    }),
  };
}

export async function loadGeoProjectContextForTool(
  organizationId: string,
  projectId: string,
  includeAnswers: boolean
) {
  const since = new Date(Date.now() - GEO_CONTEXT_LOOKBACK_DAYS * MS_PER_DAY);
  const mentionWhere = and(
    eq(geoMentionChecks.projectId, projectId),
    eq(geoMentionChecks.organizationId, organizationId),
    isNull(geoMentionChecks.sequenceId),
    inArray(geoMentionChecks.language, [...GEO_CHECK_ENGLISH_LANGUAGES]),
    eq(geoMentionChecks.turn, 0),
    gte(geoMentionChecks.capturedAt, since)
  );
  const mentionOrderBy = [
    geoMentionChecks.promptId,
    geoMentionChecks.engine,
    desc(geoMentionChecks.capturedAt),
  ] as const;

  const [project, settings, competitors, prompts, checks] = await Promise.all([
    db.query.projects.findFirst({
      columns: { id: true, name: true, isSample: true },
      where: and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId)
      ),
    }),
    db.query.geoSettings.findFirst({
      columns: { companyName: true, aliases: true },
      where: and(
        eq(geoSettings.projectId, projectId),
        eq(geoSettings.organizationId, organizationId)
      ),
    }),
    db
      .select({
        name: geoCompetitors.name,
        domain: geoCompetitors.domain,
        kind: geoCompetitors.kind,
      })
      .from(geoCompetitors)
      .where(
        and(
          eq(geoCompetitors.projectId, projectId),
          eq(geoCompetitors.organizationId, organizationId)
        )
      ),
    db
      .select({ id: geoPrompts.id, prompt: geoPrompts.prompt })
      .from(geoPrompts)
      .where(
        and(
          eq(geoPrompts.projectId, projectId),
          eq(geoPrompts.organizationId, organizationId),
          eq(geoPrompts.enabled, true)
        )
      ),
    db
      .selectDistinctOn([geoMentionChecks.promptId, geoMentionChecks.engine], {
        ...mentionCheckBaseColumns,
        ...(includeAnswers ? { answer: geoMentionChecks.answer } : {}),
      })
      .from(geoMentionChecks)
      .where(mentionWhere)
      .orderBy(...mentionOrderBy)
      .limit(GEO_CONTEXT_MAX_CHECKS),
  ]);

  const latestChecks = checks.map((check) => {
    const base = {
      prompt: check.prompt,
      engine: check.engine,
      mentioned: check.mentioned,
      position: check.position,
      sentiment: check.sentiment,
      competitorsMentioned: check.competitors,
      capturedAt: check.capturedAt.toISOString(),
    };
    if (
      includeAnswers &&
      "answer" in check &&
      typeof check.answer === "string"
    ) {
      return {
        ...base,
        answer: check.answer.slice(0, GEO_CONTEXT_MAX_ANSWER_CHARS),
      };
    }
    return {
      ...base,
      excerpt: check.excerpt.slice(0, GEO_CONTEXT_MAX_EXCERPT_CHARS),
    };
  });

  return {
    found: Boolean(project),
    project: project
      ? { id: project.id, name: project.name, isSample: project.isSample }
      : null,
    brand: {
      name: settings?.companyName ?? null,
      aliases: settings?.aliases ?? [],
    },
    competitors,
    trackedPrompts: prompts.map((prompt) => prompt.prompt),
    latestChecks,
  };
}
