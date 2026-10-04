import { expect, test } from "bun:test";

import { isDailySummaryTrigger } from "@/utils/daily-summary";

function state(mentioned: boolean, position: number | null) {
  return { mentioned, position };
}

test("only mentions appearing or disappearing trigger an email", () => {
  expect(
    isDailySummaryTrigger({
      kind: "competitor_displaced",
      current: state(false, null),
    })
  ).toBe(true);
  expect(
    isDailySummaryTrigger({
      kind: "competitor_displaced",
      current: state(true, 3),
    })
  ).toBe(false);
  expect(
    isDailySummaryTrigger({ kind: "position_dropped", current: state(true, 4) })
  ).toBe(false);
  expect(
    isDailySummaryTrigger({ kind: "citation_added", current: state(true, 1) })
  ).toBe(false);
});
