import { db } from "@notra/db/drizzle";
import {
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
import { getResend } from "@notra/email/utils/resend";
import { GEO_CHANGE_KIND_LABELS } from "@notra/geo-core/constants/geo";
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
  DAILY_SUMMARY_PROMPT_MAX_LENGTH,
} from "@/constants/daily-summary";
import { sendDailySummaryEmail } from "@/lib/email/send";
import type { DailySummaryOrganizationResult } from "@/types/email/daily-summary";
import {
  aggregateMentionTotals,
  buildDailySummary,
  getPreviousUtcDayWindow,
  isQuietDailySummary,
  isUnchangedDailySummary,
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
  const resend = getResend();

  const result: DailySummaryCronResult = {
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    organizationsConsidered: 0,
    emailsSent: 0,
    skippedQuiet: 0,
    failed: 0,
  };

  if (!resend) {
    throw new Error("Resend API key not configured");
  }

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
        resend,
      });

      if (sent === "quiet") {
        result.skippedQuiet += 1;
      } else {
        result.emailsSent += sent.emailsSent;
        result.failed += Number(sent.failed);
      }
    } catch (error) {
      result.failed += 1;
      console.error("[DailySummary] Failed to send GEO recap", {
        organizationId: setting.organizationId,
        error,
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
  resend,
}: {
  organizationId: string;
  start: Date;
  end: Date;
  dateKey: string;
  previousDateKey: string;
  appUrl: string;
  resend: NonNullable<ReturnType<typeof getResend>>;
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
        const comparison = await queryGeoScanComparison({
          projectId,
          window: { from: start, toExclusive: end },
        });
        if (
          !comparison.currentScan ||
          !yesterdayScanIds.has(comparison.currentScan.id)
        ) {
          return null;
        }

        const events = diffScanChecks(
          comparison.previous.map(toGeoScanCheckSnapshot),
          comparison.current.map(toGeoScanCheckSnapshot)
        );

        return { projectId, events };
      })
    ),
  ]);

  const projectNames = new Map(
    projectRows.map((project) => [project.id, project.name])
  );
  const includeProjectName = projectIds.length > 1;
  const changeEvents = projectChanges.flatMap((entry) => entry?.events ?? []);
  const summaryItems = projectChanges.flatMap((entry) => {
    if (!entry) {
      return [];
    }

    const projectName = projectNames.get(entry.projectId);
    return entry.events.map((event) =>
      toSummaryChangeItem(event, {
        projectName: includeProjectName ? projectName : undefined,
      })
    );
  });
  const summaries = projectChanges.flatMap((entry) =>
    entry ? [summarizeGeoChanges(entry.events)] : []
  );
  const hasNewEngine = changeEvents.some(
    (event) => event.kind === "new_engine"
  );
  const previousDay = aggregateMentionTotals(previousOverview);
  const changes = mergeChangesSummaries(summaries);
  if (
    isUnchangedDailySummary({
      yesterday,
      previousDay,
      changes,
      hasNewEngine,
    })
  ) {
    return "quiet";
  }

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
  // Send sequentially so recipient retries do not create concurrent Resend bursts.
  for (const recipientEmail of ownerEmails) {
    const result = await sendDailySummaryEmail(resend, {
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
      netChange: summary.netChange,
      items: summary.items,
      remainingCount: summary.remainingCount,
      dashboardLink: `${appUrl}/${org.slug}/geo`,
      dateKey,
    });

    if (result.error) {
      console.warn(
        `[DailySummary] Failed to send GEO recap to ${recipientEmail}:`,
        result.error
      );
      failed = true;
      continue;
    }

    sent += 1;
  }

  return { emailsSent: sent, failed };
}

function toSummaryChangeItem(
  event: GeoChangeEvent,
  { projectName }: { projectName?: string }
) {
  const prompt = truncatePrompt(event.prompt, DAILY_SUMMARY_PROMPT_MAX_LENGTH);
  const family = engineFamilyOf(event.engine);
  const engineLabel = engineFamilyLabel(family);
  const kindLabel = GEO_CHANGE_KIND_LABELS[event.kind];

  return {
    title: projectName ? `${projectName}: ${prompt}` : prompt,
    detail: kindLabel,
    engineLabel,
    engineIconSrc: engineEmailLogoSrc(family),
    tone: changeTone(event.kind),
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
