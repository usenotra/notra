import type { DateTimeFormatOptions } from "use-intl";

import type {
  ScheduleDialogMode,
  ScheduleDialogModeConfig,
  SchedulePollTier,
} from "@/types/content/schedule";

/** Monday first, like the rest of the dashboard's week pickers. */
export const CONTENT_CALENDAR_WEEK_STARTS_ON = 1;

/** Chips a month cell shows before collapsing the rest into "+N more". */
export const CONTENT_CALENDAR_MONTH_CELL_LIMIT = 3;

/** Default time for a post dropped on a day or scheduled for the first time. */
export const CONTENT_CALENDAR_DEFAULT_HOUR = 9;

/** Cap on projected automation runs per schedule and visible range. */
export const CONTENT_CALENDAR_MAX_PROJECTED_RUNS = 62;

/** How long a prefetched neighbouring month counts as fresh. */
export const CONTENT_CALENDAR_PREFETCH_STALE_MS = 30_000;

/** Poll intervals of the month view, by how close its schedules are to going out. */
/** Query param holding the calendar's month, as any day in it. */
export const CONTENT_CALENDAR_DATE_PARAM = "date";

/** Hover time before the first chip tooltip opens; later ones glide over. */
export const CONTENT_CALENDAR_TOOLTIP_DELAY_MS = 300;

export const CONTENT_CALENDAR_POLL_MS = {
  active: 15_000,
  idle: 60_000,
} as const satisfies Record<SchedulePollTier, number>;

/** Poll intervals of one post's schedule, by how close it is to going out. */
export const POST_SCHEDULE_POLL_MS = {
  active: 5000,
  idle: 60_000,
} as const satisfies Record<SchedulePollTier, number>;

/** Poll a post's schedule this close to its slot so the status flips live. */
export const POST_SCHEDULE_IMMINENT_WINDOW_MS = 2 * 60 * 1000;

export const CONTENT_CALENDAR_DRAG_MIME = "application/x-notra-calendar-post";

/** How a schedule's slot reads in toasts and on the schedule button. */
export const SCHEDULE_SLOT_DATE_FORMAT = {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
} as const satisfies DateTimeFormatOptions;

/** The dot beside a destination's status, in its tooltip and status list. */
export const SCHEDULED_PUBLICATION_STATUS_DOTS = {
  scheduled: "bg-info",
  publishing: "bg-warning",
  published: "bg-success",
  failed: "bg-destructive",
  canceled: "bg-muted-foreground",
} as const;

/** What the schedule dialog shows and offers in each mode. */
export const SCHEDULE_DIALOG_MODES = {
  create: {
    titleKey: "title",
    secondaryAction: null,
    canPublishNow: false,
    editable: true,
  },
  edit: {
    titleKey: "editTitle",
    secondaryAction: "unschedule",
    canPublishNow: true,
    editable: true,
  },
  locked: {
    titleKey: "statusTitle",
    secondaryAction: "unschedule",
    canPublishNow: false,
    editable: false,
  },
  failed: {
    titleKey: "statusTitle",
    secondaryAction: "dismiss",
    canPublishNow: false,
    editable: false,
  },
} as const satisfies Record<ScheduleDialogMode, ScheduleDialogModeConfig>;

/**
 * A QStash wake that lands this much before its due time (clock skew between
 * QStash and us) still claims what was due then, instead of claiming nothing
 * and leaving the post to the next cron sweep. Kept to seconds: a post must
 * never go out noticeably before its slot.
 */
export const SCHEDULED_PUBLICATION_WAKE_EARLY_TOLERANCE_MS = 5 * 1000;

/** Internal route the workflow step publishes a claimed row through. */
export const SCHEDULED_PUBLICATION_ATTEMPT_ROUTE_PATH =
  "/api/internal/content/scheduled-publication-attempt";
