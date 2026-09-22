import { expect, mock, test } from "bun:test";

import {
  $createTableNodeWithDimensions,
  $createTableSelectionFrom,
  $isTableCellNode,
  TableCellNode,
  TableNode,
  TableRowNode,
} from "@lexical/table";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isTextNode,
  $setSelection,
  createEditor,
} from "lexical";

const editor = createEditor({
  nodes: [TableNode, TableRowNode, TableCellNode],
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

function renderSelectionPlugin(
  onSelectionChange: ReturnType<typeof mock>,
  selectedExcerpt: Parameters<typeof SelectionPlugin>[0]["selectedExcerpt"]
) {
  hookIndex = 0;
  SelectionPlugin({ onSelectionChange, selectedExcerpt });
}

test("select, change, blur, collapse, whitespace, and delete", () => {
  const onSelectionChange = mock();
  renderSelectionPlugin(onSelectionChange, null);
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
  renderSelectionPlugin(onSelectionChange, selectedExcerpt);
  renderSelectionPlugin(onSelectionChange, null);
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

test("table row selection is attached as chat excerpt", () => {
  for (const cleanup of cleanups) {
    cleanup?.();
  }
  cleanups.length = 0;
  refs.length = 0;
  const onSelectionChange = mock();
  renderSelectionPlugin(onSelectionChange, null);
  editor.update(
    () => {
      $getRoot().clear();
      const table = $createTableNodeWithDimensions(2, 3, false);
      const rows = [
        ["Notra", "Source-connected", "Changelogs"],
        ["row", "two", "unused"],
      ];
      for (const [rowIndex, rowNode] of table.getChildren().entries()) {
        const cells = rowNode.getChildren().filter($isTableCellNode);
        for (const [cellIndex, cell] of cells.entries()) {
          const text = cell.getFirstDescendant();
          if ($isTextNode(text)) {
            text.setTextContent(rows[rowIndex]?.[cellIndex] ?? "");
          }
        }
      }
      $getRoot().append(table);
      const cells = table
        .getFirstChildOrThrow()
        .getChildren()
        .filter($isTableCellNode);
      const firstCell = cells[0];
      const lastCell = cells.at(-1);
      if (!(firstCell && lastCell)) {
        throw new Error("expected a table row with cells");
      }
      $setSelection($createTableSelectionFrom(table, firstCell, lastCell));
    },
    { discrete: true }
  );
  expect(onSelectionChange.mock.calls.at(-1)?.[0]).toEqual({
    text: "Notra\tSource-connected\tChangelogs",
    startLine: 1,
    startChar: 1,
    endLine: 5,
    endChar: 11,
  });
  const selectedExcerpt = onSelectionChange.mock.calls.at(-1)?.[0] ?? null;
  renderSelectionPlugin(onSelectionChange, selectedExcerpt);
  renderSelectionPlugin(onSelectionChange, null);
  editor.update(() => undefined, { discrete: true });
  editor.getEditorState().read(() => {
    expect($getSelection()).toBeNull();
  });
});
