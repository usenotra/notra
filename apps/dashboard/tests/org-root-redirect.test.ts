import { describe, expect, test } from "bun:test";

import { resolveOrgRootRedirect } from "@/utils/nav";

describe("resolveOrgRootRedirect", () => {
  test("keeps studio users on the org root", () => {
    expect(resolveOrgRootRedirect("acme", "studio", "proj-1")).toBeNull();
    expect(resolveOrgRootRedirect("acme", null)).toBeNull();
  });

  test("sends geo users to the geo overview with their project", () => {
    expect(resolveOrgRootRedirect("acme", "geo", "proj-1")).toBe(
      "/acme/geo?project=proj-1"
    );
    expect(resolveOrgRootRedirect("acme", "geo")).toBe("/acme/geo");
  });

  test("forwards the settings deep link through the redirect", () => {
    expect(
      resolveOrgRootRedirect("acme", "geo", "proj-1", {
        settings: "general",
      })
    ).toBe("/acme/geo?project=proj-1&settings=general");
    expect(
      resolveOrgRootRedirect("acme", "geo", undefined, {
        settings: "billing",
      })
    ).toBe("/acme/geo?settings=billing");
  });

  test("never duplicates the project param it already resolved", () => {
    expect(
      resolveOrgRootRedirect("acme", "geo", "proj-1", {
        project: "proj-2",
        settings: "general",
      })
    ).toBe("/acme/geo?project=proj-1&settings=general");
  });

  test("forwards repeated and encoded params", () => {
    expect(
      resolveOrgRootRedirect("acme", "geo", undefined, {
        tab: ["one", "two"],
        q: "a b&c",
        empty: undefined,
      })
    ).toBe("/acme/geo?tab=one&tab=two&q=a+b%26c");
  });
});
