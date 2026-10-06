import { describe, expect, test } from "bun:test";

import { unnestLinks } from "../compiler/utils/nested-links";

describe("unnestLinks", () => {
  test("keeps the outer link and the inner text", () => {
    expect(
      unnestLinks(
        '<a href="mailto:a@b.co"><a href="mailto:a@b.co">a@b.co</a></a> <a href="/x">x</a>'
      )
    ).toBe(
      '<a href="mailto:a@b.co"><span>a@b.co</span></a> <a href="/x">x</a>'
    );
  });

  test("leaves scripts, comments and lookalike tags alone", () => {
    const html =
      '<abbr>x</abbr><script>var s="<a href=1><a>"</script><!-- <a> --><a href="/y">y</a>';
    expect(unnestLinks(html)).toBe(html);
  });
});
