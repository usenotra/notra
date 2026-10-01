import { describe, expect, test } from "bun:test";

import { isNavigation } from "./sidebar-navigation";

describe("mobile sidebar navigation", () => {
  test("filling in the active project is not a navigation", () => {
    expect(isNavigation("/acme/geo?", "/acme/geo?project=p1")).toBe(false);
  });

  test("switching project, page or other params is a navigation", () => {
    expect(isNavigation("/acme/geo?project=p1", "/acme/geo?project=p2")).toBe(
      true
    );
    expect(isNavigation("/acme/geo?", "/acme/content?project=p1")).toBe(true);
    expect(isNavigation("/acme/geo?", "/acme/geo?tab=journeys")).toBe(true);
  });
});
