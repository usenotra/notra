"use client";

import { GEO_DEFAULT_RANGE } from "@notra/geo-core/constants/geo";
import type { GeoRangePreset } from "@notra/geo-core/types/geo";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";

import { trackEvent } from "@/lib/analytics/posthog-client";
import type { GeoDateRange, GeoRangeControl } from "@/types/geo";
import {
  geoRangeSpanDays,
  parseGeoRangeParam,
  serializeGeoCustomRange,
  serializeGeoRangeState,
} from "@/utils/geo-range";

export function useGeoRange(): GeoRangeControl {
  const [raw, setRaw] = useQueryState(
    "range",
    parseAsString.withDefault(GEO_DEFAULT_RANGE)
  );

  return useMemo(() => {
    const state = parseGeoRangeParam(raw);
    return {
      ...state,
      days: geoRangeSpanDays(state.range),
      query: { from: state.range.dateFrom, to: state.range.dateTo },
      param: serializeGeoRangeState(state),
      setPreset: (preset: GeoRangePreset) => {
        trackEvent(POSTHOG_EVENTS.GEO_RANGE_CHANGED, {
          range_preset: preset,
          is_custom: false,
        });
        setRaw(preset === GEO_DEFAULT_RANGE ? null : preset);
      },
      setCustom: (range: GeoDateRange) => {
        trackEvent(POSTHOG_EVENTS.GEO_RANGE_CHANGED, {
          range_preset: "custom",
          is_custom: true,
          days: geoRangeSpanDays(range),
        });
        setRaw(serializeGeoCustomRange(range));
      },
    };
  }, [raw, setRaw]);
}
