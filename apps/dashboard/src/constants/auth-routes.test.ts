import { describe, expect, test } from "bun:test";

import { NON_DASHBOARD_PATH } from "./auth-routes";

describe("NON_DASHBOARD_PATH", () => {
  test.each([
    "/login",
    "/signup",
    "/s",
    "/s/abc123456",
    "/s/demoShareUnlisted1",
  ])("lets anonymous visitors through %s", (path) => {
    expect(NON_DASHBOARD_PATH.test(path)).toBe(true);
  });

  test.each([
    "/acme/content",
    "/acme/content/post_unlisted",
    "/sales",
    "/start",
  ])("still requires a session for %s", (path) => {
    expect(NON_DASHBOARD_PATH.test(path)).toBe(false);
  });
});
