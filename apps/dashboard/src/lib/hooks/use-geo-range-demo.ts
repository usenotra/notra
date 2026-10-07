"use client";

import { GEO_DEFAULT_RANGE } from "@notra/geo-core/constants/geo";
import type { GeoRangePreset } from "@notra/geo-core/types/geo";
import { useState } from "react";

import type { GeoDateRange, GeoRangeControl, GeoRangeState } from "@/types/geo";
import {
  geoPresetRange,
  geoRangeSpanDays,
  serializeGeoRangeState,
} from "@/utils/geo-range";

export function useGeoRangeDemo(): GeoRangeControl {
  const [state, setState] = useState<GeoRangeState>(() => ({
    preset: GEO_DEFAULT_RANGE,
    range: geoPresetRange(GEO_DEFAULT_RANGE),
  }));

  return {
    ...state,
    days: geoRangeSpanDays(state.range),
    query: { from: state.range.dateFrom, to: state.range.dateTo },
    param: serializeGeoRangeState(state),
    setPreset: (preset: GeoRangePreset) =>
      setState({ preset, range: geoPresetRange(preset) }),
    setCustom: (range: GeoDateRange) => setState({ preset: "custom", range }),
  };
}
