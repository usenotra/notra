import { expect, mock, test } from "bun:test";

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $setSelection,
  createEditor,
} from "lexical";

const editor = createEditor({
  onError: (error) => {
    throw error;
  },
});
mock.module("@lexical/react/LexicalComposerContext", () => ({
  useLexicalComposerContext: () => [editor],
}));
mock.module("react", () => ({
  useEffect: (effect: () => void) => effect(),
}));
const { SelectionPlugin } =
  await import("../../src/components/content/editor/plugins/selection-plugin");

test("select, change, blur, collapse, whitespace, and delete", () => {
  const onSelectionChange = mock();
  SelectionPlugin({ onSelectionChange });
  editor.update(
    () => {
      const text = $createTextNode("Alpha beta gamma");
      $getRoot().append($createParagraphNode().append(text));
      text.select(6, 10);
    },
    { discrete: true }
  );
  expect(onSelectionChange.mock.calls.at(-1)?.[0]).toEqual({
    text: "beta",
    startLine: 1,
    startChar: 7,
    endLine: 1,
    endChar: 11,
  });

  editor.update(() => $getRoot().getAllTextNodes()[0]?.select(16, 11), {
    discrete: true,
  });
  expect(onSelectionChange.mock.calls.at(-1)?.[0]?.text).toBe("gamma");
  const calls = onSelectionChange.mock.calls.length;
  editor.update(() => $setSelection(null), { discrete: true });
  expect(onSelectionChange.mock.calls.length).toBe(calls);

  editor.update(() => $getRoot().getAllTextNodes()[0]?.select(3, 3), {
    discrete: true,
  });
  expect(onSelectionChange.mock.calls.at(-1)?.[0]).toBeNull();
  editor.update(() => $getRoot().getAllTextNodes()[0]?.select(5, 6), {
    discrete: true,
  });
  expect(onSelectionChange.mock.calls.at(-1)?.[0]).toBeNull();
  editor.update(() => $getRoot().getAllTextNodes()[0]?.select(0, 5), {
    discrete: true,
  });
  expect(onSelectionChange.mock.calls.at(-1)?.[0]?.text).toBe("Alpha");
  editor.update(
    () => {
      $getRoot().getAllTextNodes()[0]?.spliceText(0, 5, "", true);
    },
    { discrete: true }
  );
  expect(onSelectionChange.mock.calls.at(-1)?.[0]).toBeNull();
});
