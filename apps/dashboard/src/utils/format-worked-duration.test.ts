import { describe, expect, test } from "bun:test";

import { formatWorkedDurationLabel } from "./format-worked-duration";

describe("formatWorkedDurationLabel", () => {
  test("uses Working while the timer has not started", () => {
    expect(formatWorkedDurationLabel(null, true)).toBe("Working");
    expect(formatWorkedDurationLabel(0, true)).toBe("Working");
  });

  test("uses Worked for Xs once a duration exists", () => {
    expect(formatWorkedDurationLabel(9, true)).toBe("Worked for 9s");
    expect(formatWorkedDurationLabel(9, false)).toBe("Worked for 9s");
    expect(formatWorkedDurationLabel(65, false)).toBe("Worked for 1m 5s");
  });

  test("falls back to Worked when finished without a duration", () => {
    expect(formatWorkedDurationLabel(null, false)).toBe("Worked");
  });
});
