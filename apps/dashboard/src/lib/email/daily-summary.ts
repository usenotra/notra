import { logError, logWarn } from "@notra/ai/utils/server-log";
import { db } from "@notra/db/drizzle";
import {
  geoCompetitors,
  geoScans,
  members,
  organizationNotificationSettings,
  organizations,
  projects,
} from "@notra/db/schema";
import {
  queryGeoCheckOverview,
  queryGeoScanComparison,
  toGeoCheckWindow,
} from "@notra/db/utils/geo-checks";
import { EMAIL_CONFIG } from "@notra/email/utils/config";
import { engineEmailLogoSrc } from "@notra/email/utils/engine-logo";
import { toGeoCompetitor } from "@notra/geo-core/geo/mappers";
import type { GeoChangeEvent, GeoChangeKind } from "@notra/geo-core/types/geo";
import {
  diffScanChecks,
  summarizeGeoChanges,
  toGeoScanCheckSnapshot,
} from "@notra/geo-core/utils/geo-changes";
import {
  engineFamilyLabel,
  engineFamilyOf,
} from "@notra/geo-core/utils/geo-engine-family";
import { and, asc, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";

import {
  DAILY_SUMMARY_MAX_ITEMS,
  DAILY_SUMMARY_LISTED_CHANGE_KINDS,
  DAILY_SUMMARY_PROMPT_MAX_LENGTH,
} from "@/constants/daily-summary";
import { sendDailySummaryEmail } from "@/lib/email/send";
import type { DailySummaryOrganizationResult } from "@/types/email/daily-summary";
import {
  aggregateMentionTotals,
  buildDailySummary,
  formatDailySummaryChangeDetail,
  getPreviousUtcDayWindow,
  groupDailySummaryItems,
  isDailySummaryTrigger,
  isQuietDailySummary,
  mergeChangesSummaries,
  truncatePrompt,
  utcDateKey,
} from "@/utils/daily-summary";

export interface DailySummaryCronResult {
  windowStart: string;
  windowEnd: string;
  organizationsConsidered: number;
  emailsSent: number;
  skippedQuiet: number;
  failed: number;
}

export async function runDailySummaryCron(
  now = new Date()
): Promise<DailySummaryCronResult> {
  const { start, end } = getPreviousUtcDayWindow(now);
  const dateKey = utcDateKey(start);
  const previousDateKey = utcDateKey(
    new Date(start.getTime() - 24 * 60 * 60 * 1000)
  );
  const appUrl = EMAIL_CONFIG.getAppUrl();

  const result: DailySummaryCronResult = {
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    organizationsConsidered: 0,
    emailsSent: 0,
    skippedQuiet: 0,
    failed: 0,
  };

  const optedInSettings = await db
    .select({ organizationId: organizations.id })
    .from(organizations)
    .leftJoin(
      organizationNotificationSettings,
      eq(organizationNotificationSettings.organizationId, organizations.id)
    )
    .where(
      or(
        eq(organizationNotificationSettings.dailySummary, true),
        isNull(organizationNotificationSettings.id)
      )
    )
    .orderBy(asc(organizations.id));

  result.organizationsConsidered = optedInSettings.length;

  for (const setting of optedInSettings) {
    try {
      const sent = await sendDailySummaryForOrganization({
        organizationId: setting.organizationId,
        start,
        end,
        dateKey,
        previousDateKey,
        appUrl,
      });

      if (sent === "quiet") {
        result.skippedQuiet += 1;
      } else {
        result.emailsSent += sent.emailsSent;
        result.failed += Number(sent.failed);
      }
    } catch (error) {
      result.failed += 1;
      logError("[DailySummary] Failed to send GEO recap", error, {
        organizationId: setting.organizationId,
      });
    }
  }

  return result;
}

async function sendDailySummaryForOrganization({
  organizationId,
  start,
  end,
  dateKey,
  previousDateKey,
  appUrl,
}: {
  organizationId: string;
  start: Date;
  end: Date;
  dateKey: string;
  previousDateKey: string;
  appUrl: string;
}): Promise<DailySummaryOrganizationResult> {
  const [
    org,
    ownerMemberships,
    finishedScans,
    yesterdayOverview,
    previousOverview,
  ] = await Promise.all([
    db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
      columns: { name: true, slug: true },
    }),
    db.query.members.findMany({
      where: and(
        eq(members.organizationId, organizationId),
        eq(members.role, "owner")
      ),
      with: { users: { columns: { email: true } } },
    }),
    db.query.geoScans.findMany({
      where: and(
        eq(geoScans.organizationId, organizationId),
        eq(geoScans.status, "completed"),
        gte(geoScans.finishedAt, start),
        lt(geoScans.finishedAt, end)
      ),
      columns: { id: true, projectId: true },
      orderBy: [asc(geoScans.projectId), asc(geoScans.id)],
    }),
    queryGeoCheckOverview(
      { organizationId, projectId: null },
      toGeoCheckWindow({ from: dateKey, to: dateKey })
    ),
    queryGeoCheckOverview(
      { organizationId, projectId: null },
      toGeoCheckWindow({ from: previousDateKey, to: previousDateKey })
    ),
  ]);

  const ownerEmails: string[] = [];
  for (const membership of ownerMemberships) {
    const email = membership.users.email;
    if (email) {
      ownerEmails.push(email);
    }
  }

  if (!(org && ownerEmails.length > 0)) {
    return "quiet";
  }

  const yesterday = aggregateMentionTotals(yesterdayOverview);
  if (
    isQuietDailySummary({
      scansCompleted: finishedScans.length,
      yesterdayChecks: yesterday.checks,
    })
  ) {
    return "quiet";
  }

  const projectIds = [...new Set(finishedScans.map((scan) => scan.projectId))];
  const yesterdayScanIds = new Set(finishedScans.map((scan) => scan.id));
  const [projectRows, projectChanges] = await Promise.all([
    projectIds.length === 0
      ? Promise.resolve([])
      : db.query.projects.findMany({
          where: inArray(projects.id, projectIds),
          columns: { id: true, name: true },
        }),
    Promise.all(
      projectIds.map(async (projectId) => {
        const [comparison, competitorRows] = await Promise.all([
          queryGeoScanComparison({
            projectId,
            window: { from: start, toExclusive: end },
          }),
          db.query.geoCompetitors.findMany({
            where: eq(geoCompetitors.projectId, projectId),
          }),
        ]);
        if (
          !comparison.currentScan ||
          !yesterdayScanIds.has(comparison.currentScan.id)
        ) {
          return null;
        }

        const events = diffScanChecks(
          comparison.previous.map(toGeoScanCheckSnapshot),
          comparison.current.map(toGeoScanCheckSnapshot),
          competitorRows.map(toGeoCompetitor)
        );

        return { projectId, events };
      })
    ),
  ]);

  const projectNames = new Map(
    projectRows.map((project) => [project.id, project.name])
  );
  const includeProjectName = projectIds.length > 1;
  const changeEvents = projectChanges.flatMap((entry) =>
    entry
      ? entry.events.map((event) => ({ projectId: entry.projectId, event }))
      : []
  );
  if (!changeEvents.some(({ event }) => isDailySummaryTrigger(event))) {
    return "quiet";
  }

  // Changes that triggered the email go first so the visible rows always
  // explain the headline, even when other projects have many rank changes.
  const listedEvents = changeEvents
    .filter(({ event }) => DAILY_SUMMARY_LISTED_CHANGE_KINDS.has(event.kind))
    .toSorted(
      (left, right) =>
        Number(isDailySummaryTrigger(right.event)) -
        Number(isDailySummaryTrigger(left.event))
    );
  const summaryItems = groupDailySummaryItems(
    listedEvents.map(({ projectId, event }) =>
      toSummaryChangeItem(event, {
        projectId,
        projectName: includeProjectName
          ? projectNames.get(projectId)
          : undefined,
      })
    )
  );
  const summaries = projectChanges.flatMap((entry) =>
    entry ? [summarizeGeoChanges(entry.events)] : []
  );
  const previousDay = aggregateMentionTotals(previousOverview);
  const changes = mergeChangesSummaries(summaries);

  const visibleItems = summaryItems.slice(0, DAILY_SUMMARY_MAX_ITEMS);
  const summary = buildDailySummary({
    windowStart: start,
    scansCompleted: finishedScans.length,
    yesterday,
    previousDay,
    changes,
    items: visibleItems,
    remainingCount: Math.max(summaryItems.length - visibleItems.length, 0),
  });

  let sent = 0;
  let failed = false;
  // Send sequentially so recipient retries do not create concurrent Brew bursts.
  for (const recipientEmail of ownerEmails) {
    const result = await sendDailySummaryEmail({
      recipientEmail,
      organizationName: org.name,
      organizationSlug: org.slug,
      dateLabel: summary.dateLabel,
      headline: summary.headline,
      mentionRateLabel: summary.mentionRateLabel,
      mentionRateDeltaLabel: summary.mentionRateDeltaLabel,
      scansCompleted: summary.scansCompleted,
      gained: summary.gained,
      lost: summary.lost,
      items: summary.items,
      remainingCount: summary.remainingCount,
      dashboardLink: `${appUrl}/${org.slug}/geo`,
      dateKey,
    });

    if (result.error) {
      logWarn("[DailySummary] Failed to send GEO recap", {
        error: result.error.message,
      });
      failed = true;
      continue;
    }

    sent += 1;
  }

  return { emailsSent: sent, failed };
}

function toSummaryChangeItem(
  event: GeoChangeEvent,
  { projectId, projectName }: { projectId: string; projectName?: string }
) {
  const prompt = truncatePrompt(event.prompt, DAILY_SUMMARY_PROMPT_MAX_LENGTH);
  const family = engineFamilyOf(event.engine);
  const engineLabel = engineFamilyLabel(family);
  const detail = formatDailySummaryChangeDetail(event);

  return {
    id: `${projectId}:${event.promptId}:${event.engine}`,
    title: projectName ? `${projectName}: ${prompt}` : prompt,
    changes: [{ id: event.kind, detail, tone: changeTone(event.kind) }],
    engineLabel,
    engineIconSrc: engineEmailLogoSrc(family),
  };
}

function changeTone(kind: GeoChangeKind): "up" | "down" | "neutral" {
  if (
    kind === "gained_mention" ||
    kind === "position_improved" ||
    kind === "citation_added"
  ) {
    return "up";
  }

  if (
    kind === "lost_mention" ||
    kind === "competitor_displaced" ||
    kind === "position_dropped" ||
    kind === "citation_removed"
  ) {
    return "down";
  }

  return "neutral";
}
