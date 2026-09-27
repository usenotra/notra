import { expect, test } from "bun:test";

import { contentDropCaretNode } from "./content-drop-caret";

test("resolves the drop caret using Firefox's caretPositionFromPoint", () => {
  const node = {} as Node;
  const doc = {
    caretPositionFromPoint: () => ({ offsetNode: node }),
  } as unknown as Document;
  expect(contentDropCaretNode(doc, 20, 40)).toBe(node);
});

test("falls back to Chromium's caretRangeFromPoint", () => {
  const node = {} as Node;
  const doc = {
    caretRangeFromPoint: () => ({ startContainer: node }),
  } as unknown as Document;
  expect(contentDropCaretNode(doc, 20, 40)).toBe(node);
});
