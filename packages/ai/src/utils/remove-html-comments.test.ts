import { describe, expect, test } from "bun:test";

import { removeHtmlComments } from "./remove-html-comments";

describe("removeHtmlComments", () => {
  test("strips nested comments that reappear after one pass", () => {
    expect(removeHtmlComments("<!-<!-- x -->- @notra -->")).toBe("");
    expect(removeHtmlComments("<!-- @notra --> visible")).toBe(" visible");
    expect(removeHtmlComments("fine <!-- @notra")).toBe("fine ");
  });
});
