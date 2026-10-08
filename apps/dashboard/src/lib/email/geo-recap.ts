import { redis } from "@notra/ai/utils/redis";
import { logError, logWarn } from "@notra/ai/utils/server-log";
import { db } from "@notra/db/drizzle";
import {
  geoContentGapSnapshots,
  members,
  organizationNotificationSettings,
  organizations,
  projects,
} from "@notra/db/schema";
import type { GeoCheckPeriodInput } from "@notra/db/types/geo-checks";
import {
  queryGeoCheckPeriodCompetitors,
  queryGeoCheckPeriodPrompts,
} from "@notra/db/utils/geo-checks";
import type {
  GeoRecapAction,
  GeoRecapCompetitor,
  GeoRecapItem,
} from "@notra/email/types/geo-recap";
import { EMAIL_CONFIG } from "@notra/email/utils/config";
import { engineEmailLogoSrc } from "@notra/email/utils/engine-logo";
import type { GeoContentGapsResponse } from "@notra/geo-core/types/geo";
import {
  engineFamilyLabel,
  engineFamilyOf,
} from "@notra/geo-core/utils/geo-engine-family";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";

import {
  GEO_ALERT_COOLDOWN_SECONDS,
  GEO_RECAP_MAX_COMPETITORS,
  GEO_RECAP_MIN_COMPETITOR_POINTS,
  GEO_RECAP_MAX_ITEMS,
  GEO_RECAP_PROMPT_MAX_LENGTH,
  GEO_RECAP_WEEKLY_SEND_DAY,
} from "@/constants/geo-recap";
import {
  sendVisibilityDropEmail,
  sendWeeklySummaryEmail,
} from "@/lib/email/send";
import type {
  GeoRecapCronResult,
  GeoRecapOrganizationResult,
  GeoRecapPair,
  GeoRecapPairChange,
  GeoRecapWindow,
} from "@/types/email/geo-recap";
import {
  aggregateRates,
  buildComparablePairs,
  buildWeeklyHeadline,
  collectPairChanges,
  competitorShares,
  detectVisibilityDrop,
  formatPairChangeDetail,
  formatPoints,
  formatRate,
  formatWeekLabel,
  getDropAlertWindow,
  getPreviousWeekWindow,
  isNewsworthyShift,
  sharePoints,
  shouldSendQuietWeek,
  truncatePrompt,
  utcDateKey,
} from "@/utils/geo-recap";

interface RecapRecipients {
  name: string;
  slug: string;
  emails: string[];
}

/**
 * One daily cron: Mondays send the weekly recap, other days only check for a
 * sharp visibility drop worth an email before the next recap.
 */
export function runGeoRecapCron(now = new Date()): Promise<GeoRecapCronResult> {
  return now.getUTCDay() === GEO_RECAP_WEEKLY_SEND_DAY
    ? runRecapForOrganizations("weekly", getPreviousWeekWindow(now), (input) =>
        sendWeeklyRecap(input)
      )
    : runRecapForOrganizations("drop_alert", getDropAlertWindow(now), (input) =>
        sendDropAlert(input)
      );
}

async function runRecapForOrganizations(
  kind: GeoRecapCronResult["kind"],
  window: GeoRecapWindow,
  send: (input: {
    organizationId: string;
    window: GeoRecapWindow;
  }) => Promise<GeoRecapOrganizationResult>
): Promise<GeoRecapCronResult> {
  const result: GeoRecapCronResult = {
    kind,
    windowStart: window.from.toISOString(),
    windowEnd: window.toExclusive.toISOString(),
    organizationsConsidered: 0,
    emailsSent: 0,
    skippedQuiet: 0,
    failed: 0,
  };

  const optedIn = await db
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

  result.organizationsConsidered = optedIn.length;

  for (const { organizationId } of optedIn) {
    try {
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- one organization at a time keeps DB and Brew load flat
      const sent = await send({ organizationId, window });
      if (sent === "quiet") {
        result.skippedQuiet += 1;
      } else {
        result.emailsSent += sent.emailsSent;
        result.failed += Number(sent.failed);
      }
    } catch (error) {
      result.failed += 1;
      logError("[GeoRecap] Failed to send GEO recap", error, {
        organizationId,
        kind,
      });
    }
  }

  return result;
}

async function loadRecipients(
  organizationId: string
): Promise<RecapRecipients | null> {
  const [org, ownerMemberships] = await Promise.all([
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
  ]);
  const emails = ownerMemberships.flatMap((membership) =>
    membership.users.email ? [membership.users.email] : []
  );
  if (!(org && emails.length > 0)) {
    return null;
  }
  return { name: org.name, slug: org.slug, emails };
}

function periodInput(
  organizationId: string,
  window: GeoRecapWindow
): GeoCheckPeriodInput {
  return { organizationId, ...window };
}

async function loadProjectNames(pairs: readonly GeoRecapPair[]) {
  const projectIds = [...new Set(pairs.map((pair) => pair.projectId))];
  if (projectIds.length < 2) {
    return new Map<string, string>();
  }
  const rows = await db.query.projects.findMany({
    where: inArray(projects.id, projectIds),
    columns: { id: true, name: true },
  });
  return new Map(rows.map((row) => [row.id, row.name]));
}

function toRecapItem(
  change: GeoRecapPairChange,
  projectNames: ReadonlyMap<string, string>
): GeoRecapItem {
  const { pair, kind } = change;
  const prompt = truncatePrompt(pair.prompt, GEO_RECAP_PROMPT_MAX_LENGTH);
  const projectName = projectNames.get(pair.projectId);
  const family = engineFamilyOf(pair.engine);

  return {
    id: pair.key,
    title: projectName ? `${projectName}: ${prompt}` : prompt,
    changes: [
      {
        id: kind,
        detail: formatPairChangeDetail(change),
        tone: kind === "gained" || kind === "rank_up" ? "up" : "down",
      },
    ],
    engineLabel: engineFamilyLabel(family),
    engineIconSrc: engineEmailLogoSrc(family),
  };
}

async function sendToRecipients(
  emails: readonly string[],
  sendOne: (email: string) => Promise<{ error: { message: string } | null }>,
  onSent?: (email: string) => Promise<void>
): Promise<GeoRecapOrganizationResult> {
  let emailsSent = 0;
  let failed = false;
  for (const email of emails) {
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential so recipient retries do not create concurrent Brew bursts
    const result = await sendOne(email);
    if (result.error) {
      logWarn("[GeoRecap] Failed to send GEO recap", {
        error: result.error.message,
      });
      failed = true;
      continue;
    }
    emailsSent += 1;
    await onSent?.(email);
  }
  return { emailsSent, failed };
}

async function sendWeeklyRecap({
  organizationId,
  window,
}: {
  organizationId: string;
  window: GeoRecapWindow;
}): Promise<GeoRecapOrganizationResult> {
  const input = periodInput(organizationId, window);
  const promptRows = await queryGeoCheckPeriodPrompts(input);
  const pairs = buildComparablePairs(promptRows);
  if (pairs.length === 0) {
    return "quiet";
  }

  const recipients = await loadRecipients(organizationId);
  if (!recipients) {
    return "quiet";
  }

  const competitorRows = await queryGeoCheckPeriodCompetitors(input);
  const changes = collectPairChanges(pairs);
  const rates = aggregateRates(pairs);
  const visibilityPoints = sharePoints(rates.previous.rate, rates.current.rate);
  const visibilityLabel = formatRate(rates.current.rate);
  const shares = competitorShares(competitorRows, pairs);
  const topMover = shares
    .map((share) => ({
      brand: share.brand,
      points: sharePoints(share.previous, share.current) ?? 0,
    }))
    .filter(
      (share) => Math.abs(share.points) >= GEO_RECAP_MIN_COMPETITOR_POINTS
    )
    .toSorted((left, right) => Math.abs(right.points) - Math.abs(left.points))
    .at(0);

  const quiet =
    changes.length === 0 && !isNewsworthyShift(visibilityPoints) && !topMover;
  if (quiet && !shouldSendQuietWeek(window)) {
    return "quiet";
  }

  const [projectNames, action] = await Promise.all([
    loadProjectNames(pairs),
    quiet
      ? Promise.resolve(undefined)
      : pickAction(recipients.slug, pairs, changes),
  ]);
  const items = changes.map((change) => toRecapItem(change, projectNames));
  const visibleItems = items.slice(0, GEO_RECAP_MAX_ITEMS);
  const competitors = buildCompetitorRows({
    ownName: recipients.name,
    ownPrevious: rates.previous.rate,
    ownCurrent: rates.current.rate,
    shares,
  });
  const gained = changes.filter((change) => change.kind === "gained").length;
  const lost = changes.filter((change) => change.kind === "lost").length;
  const weekKey = utcDateKey(window.toExclusive);
  const appUrl = EMAIL_CONFIG.getAppUrl();

  return sendToRecipients(recipients.emails, (recipientEmail) =>
    sendWeeklySummaryEmail({
      recipientEmail,
      weekKey,
      organizationName: recipients.name,
      organizationSlug: recipients.slug,
      weekLabel: formatWeekLabel(window),
      headline: buildWeeklyHeadline({
        gained,
        lost,
        visibilityPoints,
        visibilityLabel,
        topMover,
      }),
      quiet,
      visibilityLabel,
      visibilityDeltaLabel: formatPoints(visibilityPoints),
      answersChecked: rates.current.checks,
      items: visibleItems,
      remainingCount: items.length - visibleItems.length,
      // Quiet weeks keep it to the one number that held.
      competitors: quiet ? [] : competitors,
      action,
      dashboardLink: `${appUrl}/${recipients.slug}/geo`,
    })
  );
}

function buildCompetitorRows({
  ownName,
  ownPrevious,
  ownCurrent,
  shares,
}: {
  ownName: string;
  ownPrevious: number | null;
  ownCurrent: number | null;
  shares: ReturnType<typeof competitorShares>;
}): GeoRecapCompetitor[] {
  const rows = [
    ...shares.slice(0, GEO_RECAP_MAX_COMPETITORS - 1).map((share) => ({
      name: share.brand,
      current: share.current,
      previous: share.previous,
      isOwnBrand: false,
    })),
    {
      name: ownName,
      current: ownCurrent ?? 0,
      previous: ownPrevious ?? 0,
      isOwnBrand: true,
    },
  ];
  if (rows.length === 1) {
    return [];
  }
  return rows
    .toSorted((left, right) => right.current - left.current)
    .map((row) => ({
      name: row.name,
      shareLabel: formatRate(row.current),
      deltaLabel: formatPoints(sharePoints(row.previous, row.current)),
      isOwnBrand: row.isOwnBrand || undefined,
    }));
}

/**
 * One concrete next step: the strongest open content gap, else the biggest
 * prompt the brand dropped out of.
 */
async function pickAction(
  organizationSlug: string,
  pairs: readonly GeoRecapPair[],
  changes: readonly GeoRecapPairChange[]
): Promise<GeoRecapAction | undefined> {
  const appUrl = EMAIL_CONFIG.getAppUrl();
  const projectIds = [...new Set(pairs.map((pair) => pair.projectId))];
  const snapshots = await db
    .select({
      projectId: geoContentGapSnapshots.projectId,
      snapshot: geoContentGapSnapshots.snapshot,
    })
    .from(geoContentGapSnapshots)
    .where(inArray(geoContentGapSnapshots.projectId, projectIds));

  const gap = snapshots
    .flatMap(({ projectId, snapshot }) =>
      ((snapshot as GeoContentGapsResponse | null)?.promptGaps ?? [])
        .filter((row) => !(row.won || row.brief))
        .map((row) => ({ projectId, row }))
    )
    .toSorted((left, right) => right.row.opportunity - left.row.opportunity)
    .at(0);

  if (gap) {
    const named = gap.row.competitors.slice(0, 2);
    const instead =
      named.length > 0 ? ` ${named.join(" and ")} are named instead.` : "";
    return {
      eyebrow: "Biggest open gap",
      title: truncatePrompt(
        gap.row.title ?? gap.row.prompt,
        GEO_RECAP_PROMPT_MAX_LENGTH
      ),
      body: `You show up in ${formatRate(gap.row.ownMentionRate)} of these answers.${instead}`,
      href: `${appUrl}/${organizationSlug}/geo/gaps?project=${encodeURIComponent(gap.projectId)}`,
      label: "Write a post for it",
    };
  }

  const lost = changes.find((change) => change.kind === "lost");
  if (!lost) {
    return;
  }
  const { pair } = lost;
  return {
    eyebrow: "Worth a look",
    title: truncatePrompt(pair.prompt, GEO_RECAP_PROMPT_MAX_LENGTH),
    body: `${engineFamilyLabel(engineFamilyOf(pair.engine))} stopped naming you here. See who it recommends now.`,
    href: `${appUrl}/${organizationSlug}/geo/prompts?prompt=${encodeURIComponent(pair.promptId)}&project=${encodeURIComponent(pair.projectId)}`,
    label: "Open the answers",
  };
}

async function sendDropAlert({
  organizationId,
  window,
}: {
  organizationId: string;
  window: GeoRecapWindow;
}): Promise<GeoRecapOrganizationResult> {
  // A daily scan answers each prompt once a day, so the recent side only
  // needs one answer per prompt; the aggregate threshold keeps it honest.
  const pairs = buildComparablePairs(
    await queryGeoCheckPeriodPrompts(periodInput(organizationId, window)),
    1
  );
  const drop = detectVisibilityDrop(pairs);
  if (!drop) {
    return "quiet";
  }

  const recipients = await loadRecipients(organizationId);
  if (!recipients) {
    return "quiet";
  }
  const pendingEmails = await recipientsOutsideAlertCooldown({
    organizationId,
    emails: recipients.emails,
  });
  if (pendingEmails.length === 0) {
    return "quiet";
  }

  const projectNames = await loadProjectNames(pairs);
  const items = collectPairChanges(pairs)
    .filter((change) => change.kind === "lost")
    .map((change) => toRecapItem(change, projectNames));
  const visibleItems = items.slice(0, GEO_RECAP_MAX_ITEMS);
  const previousLabel = formatRate(drop.previous.rate);
  const currentLabel = formatRate(drop.current.rate);
  const dateKey = utcDateKey(window.toExclusive);
  const appUrl = EMAIL_CONFIG.getAppUrl();

  return sendToRecipients(
    pendingEmails,
    (recipientEmail) =>
      sendVisibilityDropEmail({
        recipientEmail,
        dateKey,
        organizationName: recipients.name,
        organizationSlug: recipients.slug,
        headline: `Your AI visibility dropped from ${previousLabel} to ${currentLabel}.`,
        previousLabel,
        currentLabel,
        deltaLabel: formatPoints(drop.points),
        items: visibleItems,
        remainingCount: items.length - visibleItems.length,
        dashboardLink: `${appUrl}/${recipients.slug}/geo`,
      }),
    (recipientEmail) => startAlertCooldown(organizationId, recipientEmail)
  );
}

function alertCooldownKey(organizationId: string, email: string) {
  return `geo-recap:drop-alert:v1:${organizationId}:${email.toLowerCase()}`;
}

/**
 * Owners hear about a drop once per cooldown, not every day it lasts. The
 * cooldown starts only after a successful send, so a failed send is retried
 * by the next run. Without a working Redis everyone is due: a repeated alert
 * beats a lost one, and Brew's per-day idempotency key stops same-day repeats.
 */
async function recipientsOutsideAlertCooldown({
  organizationId,
  emails,
}: {
  organizationId: string;
  emails: readonly string[];
}): Promise<string[]> {
  if (redis) {
    try {
      const active = await redis.mget<(string | null)[]>(
        ...emails.map((email) => alertCooldownKey(organizationId, email))
      );
      return emails.filter((_, index) => active[index] === null);
    } catch (error) {
      logWarn("[GeoRecap] Drop alert cooldown lookup failed", {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return [...emails];
}

async function startAlertCooldown(organizationId: string, email: string) {
  try {
    await redis?.set(alertCooldownKey(organizationId, email), "1", {
      ex: GEO_ALERT_COOLDOWN_SECONDS,
    });
  } catch (error) {
    logWarn("[GeoRecap] Drop alert cooldown write failed", {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
