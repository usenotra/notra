import type { DateTimeFormatOptions } from "next-intl";

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

export const SCHEDULED_PUBLICATION_STATUS_BADGE_VARIANTS = {
  scheduled: "info",
  publishing: "warning",
  published: "success",
  failed: "destructive",
  canceled: "outline",
} as const;

/** What the schedule dialog shows and offers in each mode. */
export const SCHEDULE_DIALOG_MODES = {
  create: {
    titleKey: "title",
    descriptionKey: "description",
    secondaryAction: null,
    canPublishNow: false,
    editable: true,
  },
  edit: {
    titleKey: "editTitle",
    descriptionKey: "description",
    secondaryAction: "unschedule",
    canPublishNow: true,
    editable: true,
  },
  locked: {
    titleKey: "statusTitle",
    descriptionKey: "statusDescription",
    secondaryAction: "unschedule",
    canPublishNow: false,
    editable: false,
  },
  failed: {
    titleKey: "statusTitle",
    descriptionKey: "statusDescription",
    secondaryAction: "dismiss",
    canPublishNow: false,
    editable: false,
  },
} as const satisfies Record<ScheduleDialogMode, ScheduleDialogModeConfig>;
