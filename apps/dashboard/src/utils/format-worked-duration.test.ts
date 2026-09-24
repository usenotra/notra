import { describe, expect, test } from "bun:test";

import { formatWorkedDurationLabel } from "./format-worked-duration";

describe("formatWorkedDurationLabel", () => {
  test("shows Worked for 0s while streaming before the first tick", () => {
    expect(formatWorkedDurationLabel(null, true)).toBe("Worked for 0s");
    expect(formatWorkedDurationLabel(0, true)).toBe("Worked for 0s");
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
