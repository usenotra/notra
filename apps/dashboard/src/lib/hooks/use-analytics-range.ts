"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";
import { useFormatter } from "use-intl";

import {
  parseLocalDay,
  parseRangeParam,
  rangeIncludesToday,
  serializeCustomRange,
} from "@/lib/analytics/date-range";
import { useAnalyticsRangeLabels } from "@/lib/hooks/use-analytics-range-labels";
import type {
  AnalyticsDateRange,
  AnalyticsRangeControl,
  AnalyticsRangePreset,
} from "@/types/analytics";

export function useAnalyticsRange(
  paramKey: string,
  defaultPreset: Exclude<AnalyticsRangePreset, "custom"> = "30d"
): AnalyticsRangeControl {
  const [raw, setRaw] = useQueryState(
    paramKey,
    parseAsString.withDefault(defaultPreset)
  );

  const presetLabels = useAnalyticsRangeLabels();
  const format = useFormatter();

  return useMemo(() => {
    const state = parseRangeParam(raw, defaultPreset);
    const formatDay = (day: string) =>
      format.dateTime(parseLocalDay(day), { month: "short", day: "numeric" });
    const from = formatDay(state.range.dateFrom);
    const to = formatDay(state.range.dateTo);
    const customLabel = from === to ? from : `${from} - ${to}`;
    const { preset } = state;
    const label =
      preset === "custom" ? customLabel : presetLabels[preset].compact;
    const hint = preset === "custom" ? customLabel : presetLabels[preset].hint;
    return {
      ...state,
      label,
      hint,
      includesToday: rangeIncludesToday(state.range),
      setPreset: (preset: Exclude<AnalyticsRangePreset, "custom">) => {
        setRaw(preset === defaultPreset ? null : preset);
      },
      setCustom: (range: AnalyticsDateRange) => {
        setRaw(serializeCustomRange(range));
      },
    };
  }, [raw, defaultPreset, setRaw, presetLabels, format]);
}
