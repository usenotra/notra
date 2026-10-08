import { expect, test } from "bun:test";

import { renderInlineMarkdown } from "../src/utils/inline-markdown";

test("banner markup renders emphasis, code and safe links", () => {
  expect(
    renderInlineMarkdown(
      "**Bold** and _emphasis_ with `code` and [docs](/docs)"
    )
  ).toBe(
    '<strong>Bold</strong> and <em>emphasis</em> with <code>code</code> and <a href="/docs">docs</a>'
  );
});

test("banner markup escapes HTML and removes unsafe link targets", () => {
  expect(
    renderInlineMarkdown("<script>alert(1)</script> [click](javascript:alert)")
  ).toBe("&lt;script&gt;alert(1)&lt;/script&gt; click");
});
