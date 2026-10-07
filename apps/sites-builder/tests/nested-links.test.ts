import { describe, expect, test } from "bun:test";

import { unnestLinks } from "../compiler/utils/nested-links";

describe("unnestLinks", () => {
  test("handles quoted attributes and uppercase anchor tags", () => {
    expect(
      unnestLinks(
        '<A href="/outer"><A title="1 > 0" href="/inner">Text</A></A>'
      )
    ).toBe('<A href="/outer"><span>Text</span></A>');
  });

  test("does not interpret markup-like text in raw-text elements", () => {
    const html =
      '<style>a::after { content: "<a><a>" }</style><textarea><a><a></textarea><!-- <a><a> --><a href="/outer"><a href="/inner">Text</a></a>';
    expect(unnestLinks(html)).toBe(
      '<style>a::after { content: "<a><a>" }</style><textarea><a><a></textarea><!-- <a><a> --><a href="/outer"><span>Text</span></a>'
    );
  });

  test("preserves malformed tag tokens instead of removing fragments", () => {
    const html = '<div><a href="/outer"><sp<a>an>Text</sp</a>an></a></div>';
    expect(unnestLinks(html)).toBe(html);
  });

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
