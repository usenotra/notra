import { expect, test } from "bun:test";

import type { GeoTrafficPoint } from "@notra/geo-core/types/geo";
import {
  buildTrafficTrendRows,
  trafficSparklineDays,
} from "@notra/geo-core/utils/ai-traffic";
import { todayIsoDate } from "@notra/geo-core/utils/day-label";

import { points, providers } from "../../tests/constants/geo-traffic";
import { buildTrafficTrendRowsForProviders } from "./ai-traffic-trend";

test.each([
  [],
  points.slice(0, 1),
  points,
  [
    {
      day: todayIsoDate(),
      source: "openai",
      visitorType: "crawler",
      visits: 1,
    },
  ],
] satisfies GeoTrafficPoint[][])(
  "direct hero days preserve the legacy day domain %j",
  (...input) => {
    for (const [from, to] of [
      [undefined, undefined],
      ["2026-10-01", "2026-10-03"],
    ]) {
      const days = trafficSparklineDays(input, from, to);
      for (const locale of ["en", "de"]) {
        const oldRows = buildTrafficTrendRows(input, locale, days);
        const oldDays = oldRows.map((row) => row.rawDay);
        expect(days).toEqual(oldDays);
        expect(days.at(-1) === todayIsoDate()).toBe(
          oldRows.at(-1)?.rawDay === todayIsoDate()
        );
        for (const hidden of [
          new Set<string>(),
          new Set(["provider-openai"]),
        ]) {
          expect(
            buildTrafficTrendRowsForProviders(
              input,
              providers,
              days,
              hidden,
              locale
            )
          ).toEqual(
            buildTrafficTrendRowsForProviders(
              input,
              providers,
              oldDays,
              hidden,
              locale
            )
          );
        }
      }
    }
  }
);
