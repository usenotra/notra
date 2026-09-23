import { describe, expect, test } from "bun:test";

import {
  contentSharePath,
  isShareToken,
  resolveContentShareHref,
} from "./content-share";

describe("content share links", () => {
  test("unlisted posts use the public token path", () => {
    expect(
      resolveContentShareHref({
        origin: "https://app.usenotra.com",
        visibility: "unlisted",
        shareToken: "abc123456",
        organizationSlug: "acme",
        contentId: "post-1",
      })
    ).toBe("https://app.usenotra.com/s/abc123456");
    expect(contentSharePath("abc123456")).toBe("/s/abc123456");
  });

  test("organization posts use the dashboard path", () => {
    expect(
      resolveContentShareHref({
        origin: "https://app.usenotra.com",
        visibility: "organization",
        shareToken: "abc123456",
        organizationSlug: "acme",
        contentId: "post-1",
      })
    ).toBe("https://app.usenotra.com/acme/content/post-1");
  });

  test("share tokens must be unguessable nanoid-shaped values", () => {
    expect(isShareToken("V1StGXR8_Z5jdHi6B-myT")).toBe(true);
    expect(isShareToken("short")).toBe(false);
    expect(isShareToken("../etc/passwd")).toBe(false);
  });
});
