import { describe, expect, test } from "bun:test";

import { canPrefetchSidebarModeHome } from "../src/utils/nav";

describe("canPrefetchSidebarModeHome", () => {
  test("allows GEO home, whose path does not cookie-redirect", () => {
    expect(canPrefetchSidebarModeHome("geo")).toBe(true);
  });

  test("blocks Studio home, which is the org root and restores GEO", () => {
    expect(canPrefetchSidebarModeHome("studio")).toBe(false);
  });
});
