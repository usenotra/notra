import type { ContentCalendarEntryView } from "@notra/ai/types/scheduled-publications";
import type { ReactNode } from "react";

import type { Trigger } from "@/types/triggers/triggers";

export interface ContentCalendarRange {
  from: Date;
  to: Date;
}

export type CalendarEntryState =
  | "published"
  | "scheduled"
  | "publishing"
  | "failed"
  | "partial";

export type CalendarItem =
  | {
      kind: "entry";
      key: string;
      at: Date;
      entry: ContentCalendarEntryView;
      state: CalendarEntryState;
    }
  | {
      kind: "automation";
      key: string;
      at: Date;
      trigger: Trigger;
    };

/** A post dragged onto a day; the drag carries only the post's ID. */
export type CalendarDropHandler = (postId: string, day: Date) => void;

export interface ContentCalendarViewProps {
  organizationId: string;
  organizationSlug: string;
  /** Rendered at the end of the calendar's header row (the view switcher). */
  toolbarEnd?: ReactNode;
}

export interface ContentCalendarGridProps {
  days: Date[];
  month: Date;
  itemsByDay: Map<string, CalendarItem[]>;
  organizationSlug: string;
  onDropPost: CalendarDropHandler;
}

export interface ContentCalendarDayProps {
  day: Date;
  items: CalendarItem[];
  outside: boolean;
  organizationSlug: string;
  onDropPost: CalendarDropHandler;
}

export interface ContentCalendarItemChipProps {
  item: CalendarItem;
  organizationSlug: string;
  /** `cell` sits in a month cell; `list` is the roomier day popover row. */
  variant: "cell" | "list";
}
