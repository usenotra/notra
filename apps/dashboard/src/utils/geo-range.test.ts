import { expect, test } from "bun:test";

import { selectGeoCalendarDraft } from "./geo-range";

test("the first calendar click starts a fresh draft instead of committing the old range", () => {
  const oldFrom = new Date(2026, 9, 1);
  const clicked = new Date(2026, 9, 2);
  expect(
    selectGeoCalendarDraft(undefined, { from: oldFrom, to: clicked }, clicked)
  ).toEqual({ from: clicked });
});

test("a second calendar click can complete the range or select an earlier end", () => {
  const start = new Date(2026, 9, 2);
  const end = new Date(2026, 9, 5);
  expect(
    selectGeoCalendarDraft({ from: start }, { from: start, to: end }, end)
  ).toEqual({ from: start, to: end });
  expect(
    selectGeoCalendarDraft({ from: end }, { from: start, to: end }, start)
  ).toEqual({ from: start, to: end });
});

test("a completed draft starts over on the next click", () => {
  const start = new Date(2026, 9, 2);
  const end = new Date(2026, 9, 5);
  const clicked = new Date(2026, 9, 7);
  expect(
    selectGeoCalendarDraft(
      { from: start, to: end },
      { from: start, to: clicked },
      clicked
    )
  ).toEqual({ from: clicked });
});
