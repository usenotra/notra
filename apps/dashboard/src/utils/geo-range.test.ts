import { expect, test } from "bun:test";

import { parseGeoRangeParam } from "./geo-range";

test("custom ranges span at most one year", () => {
  expect(parseGeoRangeParam("custom_2024-01-01_2024-12-31").preset).toBe(
    "custom"
  );
  expect(parseGeoRangeParam("custom_2024-01-01_2025-01-01").preset).toBe("30d");
  expect(parseGeoRangeParam("custom_0000-01-01_9999-12-31").preset).toBe("30d");
});
