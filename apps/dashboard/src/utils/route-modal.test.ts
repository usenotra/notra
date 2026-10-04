import { describe, expect, test } from "bun:test";

import { modalNavigationOptions } from "./route-modal";

describe("modal navigation", () => {
  test("does not intercept other organizations, sections, external URLs or same-path changes", () => {
    const location = {
      pathname: "/acme/geo/competitors/example",
      search: {},
      hash: "",
    };
    for (const href of [
      "/other/geo/competitors/example",
      "/acme/analytics/accounts/example",
      "https://example.com/acme/geo/competitors/example",
      "//example.com/acme/geo/competitors/example",
      "/acme/geo/competitors/example?range=week",
      "/acme/geo/competitors/%ZZ",
    ]) {
      expect(modalNavigationOptions(location, href)).toBeUndefined();
    }
  });
});
