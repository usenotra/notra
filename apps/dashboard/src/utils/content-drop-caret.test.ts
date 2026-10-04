import { expect, test } from "bun:test";

import { contentDropCaret } from "./content-drop-caret";

test("resolves the drop caret using Firefox's caretPositionFromPoint", () => {
  const node = {} as Node;
  const doc = {
    caretPositionFromPoint: () => ({ offsetNode: node, offset: 2 }),
  } as unknown as Document;
  expect(contentDropCaret(doc, 20, 40)).toEqual({ node, offset: 2 });
});

test("falls back to Chromium's caretRangeFromPoint", () => {
  const node = {} as Node;
  const doc = {
    caretRangeFromPoint: () => ({ startContainer: node, startOffset: 0 }),
  } as unknown as Document;
  expect(contentDropCaret(doc, 20, 40)).toEqual({ node, offset: 0 });
});
