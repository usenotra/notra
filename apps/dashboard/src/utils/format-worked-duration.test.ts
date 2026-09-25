import { describe, expect, test } from "bun:test";

import { formatWorkedDurationLabel } from "./format-worked-duration";

describe("formatWorkedDurationLabel", () => {
  test("shows the duration only after completion", () => {
    expect(formatWorkedDurationLabel(9)).toBe("Worked for 9s");
    expect(formatWorkedDurationLabel(65)).toBe("Worked for 1m 5s");
  });

  test("falls back to Worked when finished without a duration", () => {
    expect(formatWorkedDurationLabel(null)).toBe("Worked");
  });
});
