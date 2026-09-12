import { expect, test } from "bun:test";

import {
  GEO_TAB_BREADCRUMB_LABELS,
  GEO_TAB_VALUES,
} from "@notra/geo-core/constants/geo";

import { toGeoTab } from "./geo-tabs";

test("canonical and legacy sentiment tabs resolve to the same labeled view", () => {
  expect(toGeoTab("sentiment")).toBe("brand-sentiment");
  expect(toGeoTab("brand-sentiment")).toBe("brand-sentiment");
  expect(toGeoTab("prompts")).toBe("visibility");
  expect(toGeoTab("unknown")).toBe("visibility");
  expect(toGeoTab(null)).toBe("visibility");
  for (const tab of GEO_TAB_VALUES) {
    expect(toGeoTab(tab)).toBe(tab);
    expect(GEO_TAB_BREADCRUMB_LABELS[tab]).toBeTruthy();
  }
});
