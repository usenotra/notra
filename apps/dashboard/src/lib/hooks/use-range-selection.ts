"use client";

import { useCallback, useMemo, useState } from "react";
import type { DateRange, Matcher } from "react-day-picker";

interface UseRangeSelectionOptions {
  /** The range that is currently applied; shown until the user starts a new one. */
  committed: DateRange | undefined;
  /** Days that can never be picked, e.g. the future. */
  disabled?: Matcher;
  /** Longest allowed span in days, counting both ends. */
  maxDays?: number;
  onCommit: (range: { from: Date; to: Date }) => void;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function orderedRange(a: Date, b: Date): { from: Date; to: Date } {
  return a.getTime() <= b.getTime() ? { from: a, to: b } : { from: b, to: a };
}

/**
 * Two-click range picking: the first click drops the old range and sets a
 * pending start, the second click completes it. While the start is pending,
 * hovering (or focusing) a day previews the range that would be applied.
 */
export function useRangeSelection({
  committed,
  disabled,
  maxDays,
  onCommit,
}: UseRangeSelectionOptions) {
  const [anchor, setAnchor] = useState<Date | undefined>();
  const [hovered, setHovered] = useState<Date | undefined>();
  const [lastPicked, setLastPicked] = useState<DateRange | undefined>();

  const reset = useCallback(() => {
    setAnchor(undefined);
    setHovered(undefined);
    setLastPicked(undefined);
  }, []);

  const handleDayClick = useCallback(
    (day: Date) => {
      if (!anchor) {
        setAnchor(day);
        setHovered(undefined);
        setLastPicked(undefined);
        return;
      }
      const next = orderedRange(anchor, day);
      setAnchor(undefined);
      setHovered(undefined);
      setLastPicked(next);
      onCommit(next);
    },
    [anchor, onCommit]
  );

  const selected = useMemo<DateRange | undefined>(() => {
    if (anchor) {
      return hovered
        ? orderedRange(anchor, hovered)
        : { from: anchor, to: anchor };
    }
    return lastPicked ?? committed;
  }, [anchor, hovered, lastPicked, committed]);

  const spanLimit = useMemo<Matcher[]>(() => {
    if (!anchor || maxDays === undefined) {
      return [];
    }
    return [
      { before: addDays(anchor, -(maxDays - 1)) },
      { after: addDays(anchor, maxDays - 1) },
    ];
  }, [anchor, maxDays]);

  const mergedDisabled = useMemo<Matcher[]>(
    () => [...(disabled === undefined ? [] : [disabled]), ...spanLimit],
    [disabled, spanLimit]
  );

  return {
    isPending: anchor !== undefined,
    reset,
    calendarProps: {
      disabled: mergedDisabled,
      onDayClick: handleDayClick,
      onDayFocus: (day: Date) => setHovered(day),
      onDayMouseEnter: (day: Date) => setHovered(day),
      onDayMouseLeave: () => setHovered(undefined),
      // Without onSelect, react-day-picker treats `selected` as an initial value
      // and runs its own range logic on top of ours.
      onSelect: () => undefined,
      selected,
    },
  };
}
