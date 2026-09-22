import { describe, expect, test } from "bun:test";

import { sanitizeMarkdownHtml } from "./sanitize";

describe("sanitizeMarkdownHtml", () => {
  test("keeps a video element with src and controls", () => {
    const html = sanitizeMarkdownHtml(
      '<p>Clip</p><video src="/api/uploads/content-images/organization/org_1/content/abc.mp4" controls=""></video>'
    );
    expect(html).toContain("<video");
    expect(html).toContain(
      'src="/api/uploads/content-images/organization/org_1/content/abc.mp4"'
    );
    expect(html).toContain("controls");
  });

  test("drops disallowed video sources and extra attributes", () => {
    const html = sanitizeMarkdownHtml(
      '<video src="ftp://evil.test/x.mp4" controls autoplay poster="https://evil.test/x"></video>'
    );
    expect(html).not.toContain("ftp:");
    expect(html).not.toContain("autoplay");
    expect(html).not.toContain("poster");
  });
});
