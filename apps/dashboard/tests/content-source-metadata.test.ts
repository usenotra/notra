import { describe, expect, test } from "bun:test";

import {
  formatLinearSourceLabel,
  hasContentSourceReference,
} from "@/utils/content-source-metadata";
import { resolveImagePreviewSrc } from "@/utils/markdown-image";

describe("content source references", () => {
  test("keeps the source line for Linear-only content", () => {
    expect(
      hasContentSourceReference({
        repositoryCount: 0,
        linearIntegrationCount: 2,
      })
    ).toBe(true);
  });

  test("hides the source line when nothing is referenced", () => {
    expect(
      hasContentSourceReference({
        repositoryCount: 0,
        linearIntegrationCount: 0,
      })
    ).toBe(false);
  });

  test("labels Linear teams by count", () => {
    expect(formatLinearSourceLabel(1)).toBe("1 Linear team");
    expect(formatLinearSourceLabel(3)).toBe("3 Linear teams");
  });
});

describe("image download source", () => {
  test("falls back to an embedded Markdown data URL", () => {
    expect(
      resolveImagePreviewSrc({
        content: "<p>Generated image: cover</p>",
        markdown: "![cover](data:image/png;base64,AAAA)",
      })
    ).toBe("data:image/png;base64,AAAA");
  });

  test("prefers a stored http url", () => {
    expect(
      resolveImagePreviewSrc({
        content: "https://cdn.example.com/cover.png",
        markdown: "![cover](data:image/png;base64,AAAA)",
      })
    ).toBe("https://cdn.example.com/cover.png");
  });

  test("returns null when no image source exists", () => {
    expect(
      resolveImagePreviewSrc({ content: "not an image", markdown: null })
    ).toBeNull();
  });
});
