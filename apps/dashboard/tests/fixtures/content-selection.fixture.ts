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
const { SelectionPlugin } =
  await import("../../src/components/content/editor/plugins/selection-plugin");

test("select, change, blur, collapse, whitespace, and delete", () => {
  const onSelectionChange = mock();
  const renderPlugin = (
    selectedExcerpt: Parameters<typeof SelectionPlugin>[0]["selectedExcerpt"]
  ) => {
    hookIndex = 0;
    SelectionPlugin({ onSelectionChange, selectedExcerpt });
  };
  renderPlugin(null);
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
  const selectedExcerpt = onSelectionChange.mock.calls.at(-1)?.[0] ?? null;
  renderPlugin(selectedExcerpt);
  renderPlugin(null);
  const callsAfterExternalClear = onSelectionChange.mock.calls.length;
  editor.update(() => $getRoot().getAllTextNodes()[0]?.select(6, 10), {
    discrete: true,
  });
  expect(onSelectionChange.mock.calls.length).toBe(callsAfterExternalClear + 1);
  expect(onSelectionChange.mock.calls.at(-1)?.[0]?.text).toBe("beta");

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
