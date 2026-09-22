import { expect, mock, test } from "bun:test";

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
} from "lexical";

import { EDITOR_TRANSFORMERS } from "../markdown-transformers";

const editor = createEditor({
  onError: (error) => {
    throw error;
  },
});
let hookIndex = 0;
const refs: { current: unknown }[] = [];
const cleanups: ((() => void) | undefined)[] = [];
mock.module("@lexical/react/LexicalComposerContext", () => ({
  useLexicalComposerContext: () => [editor],
}));
mock.module("react", () => ({
  useEffect: (effect: () => (() => void) | undefined) => {
    const index = hookIndex++;
    cleanups[index]?.();
    cleanups[index] = effect();
  },
  useRef: (initialValue: unknown) => {
    const index = hookIndex++;
    refs[index] ??= { current: initialValue };
    return refs[index];
  },
}));
const { MarkdownSyncPlugin } = await import("./markdown-sync-plugin");

test("markdown sync skips caret moves and duplicate exports", () => {
  const onChange = mock();
  hookIndex = 0;
  MarkdownSyncPlugin({
    onChange,
    transformers: EDITOR_TRANSFORMERS,
  });

  editor.update(
    () => {
      const text = $createTextNode("Hello editor");
      $getRoot().append($createParagraphNode().append(text));
    },
    { discrete: true }
  );
  const afterInsert = onChange.mock.calls.length;
  expect(afterInsert).toBeGreaterThan(0);
  expect(onChange.mock.calls.at(-1)?.[0]).toContain("Hello editor");

  editor.update(
    () => {
      $getRoot().getAllTextNodes()[0]?.select(2, 2);
    },
    { discrete: true }
  );
  expect(onChange.mock.calls.length).toBe(afterInsert);

  editor.update(
    () => {
      $getRoot().getAllTextNodes()[0]?.spliceText(5, 0, " there", true);
    },
    { discrete: true }
  );
  expect(onChange.mock.calls.length).toBe(afterInsert + 1);
  expect(onChange.mock.calls.at(-1)?.[0]).toContain("Hello there editor");
});
