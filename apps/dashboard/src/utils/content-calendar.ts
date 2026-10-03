import type {
  ContentCalendarEntryView,
  PostScheduleView,
  ScheduleDestination,
  ScheduledPublicationView,
} from "@notra/ai/types/scheduled-publications";
import type { ScheduleSocialPlatform } from "@notra/ai/utils/schedule-destinations";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import {
  CONTENT_CALENDAR_DEFAULT_HOUR,
  CONTENT_CALENDAR_MAX_PROJECTED_RUNS,
  CONTENT_CALENDAR_WEEK_STARTS_ON,
  POST_SCHEDULE_IMMINENT_WINDOW_MS,
} from "@/constants/content-calendar";
import type {
  CalendarEntryState,
  CalendarItem,
  ContentCalendarRange,
} from "@/types/content/calendar";
import type {
  PostScheduleSummary,
  ScheduleDialogMode,
  ScheduleFormState,
  SchedulePollTier,
  ScheduleSocialOption,
} from "@/types/content/schedule";
import type { ConnectedAccount } from "@/types/hooks/connected-accounts";
import type { GitHubRepository } from "@/types/integrations";
import type { Trigger } from "@/types/triggers/triggers";
import { computeNextRun } from "@/utils/schedule-summary";

const weekOptions = { weekStartsOn: CONTENT_CALENDAR_WEEK_STARTS_ON } as const;

/** The visible days of a month grid: whole weeks around the month. */
export function getCalendarDays(anchor: Date) {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(anchor), weekOptions),
    end: endOfWeek(endOfMonth(anchor), weekOptions),
  });
}

/** `[first visible day, day after the last)` in local time. */
export function getCalendarRange(days: Date[]): ContentCalendarRange {
  const first = days.at(0) ?? new Date();
  const last = days.at(-1) ?? first;
  return { from: first, to: addDays(last, 1) };
}

export function shiftCalendarMonth(anchor: Date, direction: 1 | -1) {
  return addMonths(startOfMonth(anchor), direction);
}

export function calendarDayKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function parseCalendarDayKey(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!(year && month && day)) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Local date + `HH:MM` → the instant the user means. */
export function combineDateAndTime(date: Date, time: string) {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

export function toTimeInputValue(date: Date) {
  return format(date, "HH:mm");
}

function scheduleStateOf(
  statuses: ReadonlySet<ScheduledPublicationView["status"]>
): CalendarEntryState | null {
  if (statuses.size === 0) {
    return null;
  }
  if (statuses.has("publishing")) {
    return "publishing";
  }
  if (statuses.has("failed")) {
    return statuses.has("published") ? "partial" : "failed";
  }
  if (statuses.has("scheduled")) {
    return "scheduled";
  }
  return "published";
}

/** The one place the UI reads a schedule's row statuses. */
export function summarizePostSchedule(
  schedule: PostScheduleView | null
): PostScheduleSummary {
  const publications = schedule?.publications ?? [];
  const statuses = new Set(
    publications.map((publication) => publication.status)
  );
  const scheduled = statuses.has("scheduled");
  const publishing = statuses.has("publishing");
  return {
    state: scheduleStateOf(statuses),
    active: scheduled || publishing,
    editable: scheduled && statuses.size === 1,
    publishing,
    failed: statuses.has("failed"),
    hasOutcome: publications.some(
      (publication) => publication.status !== "scheduled"
    ),
    scheduledIds: publications
      .filter((publication) => publication.status === "scheduled")
      .map((publication) => publication.id),
  };
}

export function getCalendarEntryState(
  entry: ContentCalendarEntryView
): CalendarEntryState {
  if (entry.kind === "published") {
    return "published";
  }
  return summarizePostSchedule(entry.schedule).state ?? "published";
}

/** Fast polling near the slot or while publishing, slow while pending. */
export function schedulePollTier(
  schedule: PostScheduleView | null | undefined,
  now = Date.now()
): SchedulePollTier | null {
  const publications = schedule?.publications ?? [];
  const imminent = publications.some(
    (publication) =>
      publication.status === "publishing" ||
      (publication.status === "scheduled" &&
        Date.parse(publication.scheduledAt) - now <
          POST_SCHEDULE_IMMINENT_WINDOW_MS)
  );
  if (imminent) {
    return "active";
  }
  // TanStack evaluates the interval only after a fetch, so a page left open
  // must keep polling to notice the slot approaching.
  return publications.some((publication) => publication.status === "scheduled")
    ? "idle"
    : null;
}

export function getScheduleDialogMode({
  active,
  editable,
  failed,
}: PostScheduleSummary): ScheduleDialogMode {
  if (active) {
    return editable ? "edit" : "locked";
  }
  // Failed destinations are resolved first (retry or clear), so the dialog
  // does not offer two competing actions at once.
  return failed ? "failed" : "create";
}

function defaultScheduleSlot(now: Date) {
  const slot = startOfDay(addDays(now, 1));
  slot.setHours(CONTENT_CALENDAR_DEFAULT_HOUR);
  return slot;
}

/** The form as the dialog opens: the active schedule, or tomorrow morning. */
export function initialScheduleFormState({
  schedule,
  storedRepositoryId,
  now = new Date(),
}: {
  schedule: PostScheduleView | null;
  storedRepositoryId: string | null;
  now?: Date;
}): ScheduleFormState {
  const active = summarizePostSchedule(schedule).active ? schedule : null;
  const slot = active ? new Date(active.scheduledAt) : defaultScheduleSlot(now);
  const configs =
    active?.publications.map((publication) => publication.config) ?? [];
  const github = configs.find((config) => config.destination === "github");
  const social = configs.find((config) => config.destination === "social");
  return {
    date: slot,
    time: toTimeInputValue(slot),
    githubEnabled: Boolean(github),
    repositoryId: github?.repositoryId ?? storedRepositoryId ?? "",
    merge: github?.merge ?? true,
    socialEnabled: active ? Boolean(social) : true,
    accountId: social?.accountId ?? "",
  };
}

/**
 * The social destination of the schedule dialog. A saved account that is no
 * longer connected stays selected as missing instead of silently posting
 * from another account.
 */
export function resolveScheduleSocialOption({
  platform,
  connectedAccounts,
  loaded,
  loadFailed,
  enabled,
  accountId,
}: {
  platform: ScheduleSocialPlatform;
  connectedAccounts: ConnectedAccount[];
  loaded: boolean;
  loadFailed: boolean;
  enabled: boolean;
  accountId: string;
}): ScheduleSocialOption {
  const accounts = connectedAccounts.filter(
    (account) => account.provider === platform
  );
  const selectedAccount = accountId
    ? (accounts.find((account) => account.id === accountId) ?? null)
    : (accounts[0] ?? null);
  const accountMissing = loaded && Boolean(accountId) && !selectedAccount;
  const toggleable = accounts.length > 0 || accountMissing || loadFailed;
  return {
    platform,
    accounts,
    selectedAccount,
    loaded,
    loadFailed,
    accountMissing,
    toggleable,
    checked: enabled && toggleable,
  };
}

/**
 * What a submit sends besides Notra, and whether a destination that is on
 * cannot go out as configured yet. Until the accounts load, nobody knows
 * which account would post.
 */
export function buildScheduleDestinations({
  form,
  githubOn,
  github,
  social,
}: {
  form: Pick<ScheduleFormState, "merge" | "socialEnabled">;
  githubOn: boolean;
  github: {
    selectedRepository: GitHubRepository | undefined;
    selectedPublishingEnabled: boolean;
  };
  social: ScheduleSocialOption | null;
}): { destinations: ScheduleDestination[]; blocked: boolean } {
  const destinations: ScheduleDestination[] = [];
  if (githubOn && github.selectedRepository) {
    destinations.push({
      destination: "github",
      repositoryId: github.selectedRepository.id,
      merge: form.merge,
    });
  }
  if (social?.checked && social.selectedAccount) {
    destinations.push({
      destination: "social",
      accountId: social.selectedAccount.id,
    });
  }
  const githubIncomplete =
    githubOn &&
    !(github.selectedRepository && github.selectedPublishingEnabled);
  const socialIncomplete = Boolean(
    social && form.socialEnabled && (!social.loaded || social.accountMissing)
  );
  return { destinations, blocked: githubIncomplete || socialIncomplete };
}

/** The external destinations of a schedule, as the schedule input takes them. */
export function scheduleDestinationsOf(
  schedule: PostScheduleView
): ScheduleDestination[] {
  return schedule.publications.flatMap(({ config }) =>
    config.destination === "notra" ? [] : [config]
  );
}

/** The entry a calendar drag can move: the post's slot whose rows all still wait. */
export function findMovableEntry(
  entries: ContentCalendarEntryView[],
  postId: string
) {
  for (const entry of entries) {
    if (
      entry.kind === "scheduled" &&
      entry.post.id === postId &&
      summarizePostSchedule(entry.schedule).editable
    ) {
      return entry;
    }
  }
  return null;
}

/**
 * Upcoming runs of the organization's generation schedules inside the range.
 * These are projections from the cron settings; nothing is stored for them.
 */
export function projectAutomationRuns(
  triggers: Trigger[],
  range: ContentCalendarRange,
  now = new Date()
): CalendarItem[] {
  const items: CalendarItem[] = [];
  const start = new Date(Math.max(range.from.getTime(), now.getTime()));
  for (const trigger of triggers) {
    const cron = trigger.sourceConfig.cron;
    if (!(trigger.enabled && cron)) {
      continue;
    }
    let cursor = start;
    for (let index = 0; index < CONTENT_CALENDAR_MAX_PROJECTED_RUNS; index++) {
      const next = computeNextRun(cron, cursor);
      if (next.getTime() >= range.to.getTime()) {
        break;
      }
      items.push({
        kind: "automation",
        key: `automation:${trigger.id}:${next.toISOString()}`,
        at: next,
        trigger,
      });
      cursor = next;
    }
  }
  return items;
}

export function calendarEntryItems(
  entries: ContentCalendarEntryView[]
): CalendarItem[] {
  return entries.flatMap((entry): CalendarItem[] => {
    const at =
      entry.kind === "scheduled"
        ? entry.schedule.scheduledAt
        : entry.post.publishedAt;
    if (!at) {
      return [];
    }
    return [
      {
        kind: "entry",
        key:
          entry.kind === "scheduled"
            ? `scheduled:${entry.post.id}:${entry.schedule.scheduledAt}`
            : `published:${entry.post.id}`,
        at: new Date(at),
        entry,
        state: getCalendarEntryState(entry),
      },
    ];
  });
}

export function groupCalendarItemsByDay(items: CalendarItem[]) {
  const byDay = new Map<string, CalendarItem[]>();
  const sorted = [...items].sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const item of sorted) {
    const key = calendarDayKey(item.at);
    const list = byDay.get(key);
    if (list) {
      list.push(item);
    } else {
      byDay.set(key, [item]);
    }
  }
  return byDay;
}
