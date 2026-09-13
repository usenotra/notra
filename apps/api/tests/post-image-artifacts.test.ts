import { describe, expect, test } from "bun:test";

import { extractImageArtifactHtml } from "@notra/db/utils/post-image-artifacts";

describe("extractImageArtifactHtml", () => {
  test("returns html from image post source metadata", () => {
    expect(
      extractImageArtifactHtml({
        artifacts: { html: '<img src="https://example.test/image.png" />' },
      })
    ).toBe('<img src="https://example.test/image.png" />');
  });

  test("returns null for missing or blank artifact html", () => {
    expect(extractImageArtifactHtml(null)).toBeNull();
    expect(extractImageArtifactHtml({ artifacts: { html: "   " } })).toBeNull();
  });
});
