import { describe, expect, spyOn, test } from "bun:test";

import * as markdown from "mdast-util-from-markdown";

import { EXCERPT_CACHE_MAX_BYTES } from "../src/constants/seo";
import { excerpt } from "../src/utils/excerpt";

describe("excerpt", () => {
  test("skips oversized cache entries without changing summaries", () => {
    const parse = spyOn(markdown, "fromMarkdown").mockReturnValue({
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "text", value: "Summary." }] },
      ],
    });
    try {
      const body = "x".repeat(EXCERPT_CACHE_MAX_BYTES / 2 + 1);
      expect(excerpt(body)).toBe("Summary.");
      expect(excerpt(body)).toBe("Summary.");
      expect(parse).toHaveBeenCalledTimes(2);
    } finally {
      parse.mockRestore();
    }
  });

  test("evicts the oldest bodies when their byte budget is exceeded", () => {
    const parse = spyOn(markdown, "fromMarkdown").mockReturnValue({
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "text", value: "Summary." }] },
      ],
    });
    try {
      const size = Math.floor(EXCERPT_CACHE_MAX_BYTES / 6);
      const bodies = ["a", "b", "c"].map((letter) => letter.repeat(size));
      for (const body of bodies) {
        expect(excerpt(body)).toBe("Summary.");
      }
      expect(parse).toHaveBeenCalledTimes(3);
      expect(excerpt(bodies[2])).toBe("Summary.");
      expect(parse).toHaveBeenCalledTimes(3);
      expect(excerpt(bodies[0])).toBe("Summary.");
      expect(parse).toHaveBeenCalledTimes(4);
    } finally {
      parse.mockRestore();
    }
  });

  test("extracts Markdown text and balanced link targets", () => {
    expect(
      excerpt(
        "See [a link](/wiki/Foo_(bar)) for **details** and `snake_case`. ~~Old~~."
      )
    ).toBe("See a link for details and snake_case. Old.");
    expect(excerpt("First &amp; second.")).toBe("First & second.");
  });

  test("handles HTML attributes without leaking markup", () => {
    expect(excerpt('Hello <span title=">">world</span>.')).toBe("Hello world.");
  });

  test("excludes MDX decorations, images and expressions", () => {
    expect(
      excerpt(
        "Hello <Badge><b>New</b></Badge> **world** {value} ![cover](/cover.png)."
      )
    ).toBe("Hello world .");
    expect(excerpt("<Badge>Decoration</Badge>\n\nActual paragraph.")).toBe(
      "Actual paragraph."
    );
  });

  test("selects the first prose paragraph after non-prose blocks", () => {
    expect(
      excerpt(
        'import A from "./a.mdx";\n\n# Heading\n\n```js\nconst a = 1;\n```\n\n- Item\n\n> Quote\n\nThe first paragraph.\n\nThe next paragraph.'
      )
    ).toBe("The first paragraph.");
    expect(excerpt("```md\nAn unclosed fence")).toBeUndefined();
  });

  test("falls back to Markdown for literal braces and malformed MDX", () => {
    expect(excerpt("Hello {unfinished")).toBe("Hello {unfinished");
  });

  test("does not split Unicode surrogate pairs when truncating", () => {
    expect(excerpt("😀😀😀😀", 3)).toBe("😀😀…");
    expect(excerpt(undefined)).toBeUndefined();
    expect(excerpt("Hello", 1)).toBe("…");
  });

  test("truncates a large first paragraph to a bounded Unicode prefix", () => {
    const parse = spyOn(markdown, "fromMarkdown").mockReturnValue({
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", value: "😀".repeat(500_000) }],
        },
      ],
    });
    try {
      expect(excerpt("Large paragraph truncation regression.", 3)).toBe(
        "😀😀…"
      );
    } finally {
      parse.mockRestore();
    }
  });

  test("reuses a body's summary without reusing a different length's truncation", () => {
    const body = "A cached summary with several words.";
    expect(excerpt(body, 12)).toBe("A cached…");
    expect(excerpt(body, 160)).toBe(body);
    expect(excerpt(`${body} Updated.`, 160)).toBe(`${body} Updated.`);
  });
});
