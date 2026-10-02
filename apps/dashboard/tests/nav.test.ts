import { describe, expect, test } from "bun:test";

import {
  canPrefetchSidebarModeHome,
  resolveOrgRootRedirect,
} from "../src/utils/nav";

test("stored GEO mode preserves modal queries and selected project", () => {
  expect(
    resolveOrgRootRedirect("workspace", "geo", "selected", {
      settings: "general",
      success: "true",
      filter: ["one", "two"],
      empty: undefined,
    })
  ).toBe(
    "/workspace/geo?settings=general&success=true&filter=one&filter=two&project=selected"
  );
  expect(resolveOrgRootRedirect("workspace", "geo")).toBe("/workspace/geo");
  expect(
    resolveOrgRootRedirect("workspace", "studio", undefined, {
      settings: "general",
    })
  ).toBeNull();
});

describe("canPrefetchSidebarModeHome", () => {
  test("allows GEO home, whose path does not cookie-redirect", () => {
    expect(canPrefetchSidebarModeHome("geo")).toBe(true);
  });

  test("blocks Studio home, which is the org root and restores GEO", () => {
    expect(canPrefetchSidebarModeHome("studio")).toBe(false);
  });
});
