export interface DemoClockOffset {
  days?: number;
  hours?: number;
  minutes?: number;
}

export interface DemoClockLocalTime {
  /** Calendar days before today in the visitor's time zone (0 = today). */
  daysAgo: number;
  hour: number;
  minute?: number;
}

export interface DemoClock {
  now: Date;
  timeZone: string;
  ago(offset: DemoClockOffset): Date;
  in(offset: DemoClockOffset): Date;
  /**
   * A wall-clock time on a past calendar day in the visitor's time zone. When
   * that moment is still ahead of `now` (e.g. "today 09:00" at 07:30), it is
   * clamped to shortly before `now` so seeded history never lies in the future.
   */
  local(time: DemoClockLocalTime): Date;
  /** Start of the visitor's local day, `daysAgo` days back. */
  startOfDay(daysAgo: number): Date;
}
