import { expect, test } from "bun:test";

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
} from "lexical";

import { placeContentBlock } from "./content-place-block";

// Prepare a minimal Lexical document so insertion positions can be asserted without uploads.
function documentWithParagraphs() {
  const editor = createEditor({
    onError: (error) => {
      throw error;
    },
  });
  let rootKey = "";
  let textKey = "";
  editor.update(
    () => {
      const first = $createTextNode("BeforeAfter");
      textKey = first.getKey();
      $getRoot().append(
        $createParagraphNode().append(first),
        $createParagraphNode().append($createTextNode("Last"))
      );
      rootKey = $getRoot().getKey();
    },
    { discrete: true }
  );
  return { editor, rootKey, textKey };
}

test("drops before the first block at the root's zero offset", () => {
  const { editor, rootKey } = documentWithParagraphs();
  placeContentBlock(
    editor,
    null,
    () => $createParagraphNode().append($createTextNode("Inserted")),
    {
      key: rootKey,
      offset: 0,
      type: "element",
      beforeKey: null,
      afterKey: null,
      fallbackIndex: 0,
    }
  );
  editor.getEditorState().read(() => {
    expect($getRoot().getFirstChild()?.getTextContent()).toBe("Inserted");
  });
});

test("drops between blocks at the root's child offset", () => {
  const { editor, rootKey } = documentWithParagraphs();
  placeContentBlock(
    editor,
    null,
    () => $createParagraphNode().append($createTextNode("Inserted")),
    {
      key: rootKey,
      offset: 1,
      type: "element",
      beforeKey: null,
      afterKey: null,
      fallbackIndex: 1,
    }
  );
  editor.getEditorState().read(() => {
    expect(
      $getRoot()
        .getChildren()
        .map((node) => node.getTextContent())
    ).toEqual(["BeforeAfter", "Inserted", "", "Last"]);
  });
});

test("drops inside a paragraph at its exact text offset", () => {
  const { editor, textKey } = documentWithParagraphs();
  placeContentBlock(
    editor,
    null,
    () => $createParagraphNode().append($createTextNode("Inserted")),
    {
      key: textKey,
      offset: 6,
      type: "text",
      beforeKey: null,
      afterKey: null,
      fallbackIndex: 1,
    }
  );
  editor.getEditorState().read(() => {
    expect(
      $getRoot()
        .getChildren()
        .map((node) => node.getTextContent())
    ).toEqual(["Before", "Inserted", "", "After", "Last"]);
  });
});

test("retains the nearest surviving block when the dropped-on text is replaced", () => {
  const { editor, textKey } = documentWithParagraphs();
  let firstKey = "";
  let lastKey = "";
  editor.getEditorState().read(() => {
    firstKey = $getRoot().getFirstChild()?.getKey() ?? "";
    lastKey = $getRoot().getLastChild()?.getKey() ?? "";
  });
  editor.update(
    () => {
      $getRoot()
        .getFirstChild()
        ?.replace($createParagraphNode().append($createTextNode("Edited")));
    },
    { discrete: true }
  );
  placeContentBlock(
    editor,
    null,
    () => $createParagraphNode().append($createTextNode("Inserted")),
    {
      key: textKey,
      offset: 6,
      type: "text",
      beforeKey: lastKey,
      afterKey: firstKey,
      fallbackIndex: 1,
    }
  );
  editor.getEditorState().read(() => {
    expect(
      $getRoot()
        .getChildren()
        .map((node) => node.getTextContent())
    ).toEqual(["Edited", "Inserted", "", "Last"]);
  });
});

test("keeps a first-block drop near its location when that block is removed", () => {
  const { editor, rootKey } = documentWithParagraphs();
  let firstKey = "";
  let lastKey = "";
  editor.getEditorState().read(() => {
    firstKey = $getRoot().getFirstChild()?.getKey() ?? "";
    lastKey = $getRoot().getLastChild()?.getKey() ?? "";
  });
  editor.update(() => $getRoot().getFirstChild()?.remove(), {
    discrete: true,
  });
  placeContentBlock(
    editor,
    null,
    () => $createParagraphNode().append($createTextNode("Inserted")),
    {
      key: rootKey,
      offset: 0,
      type: "element",
      beforeKey: firstKey,
      afterKey: null,
      fallbackIndex: 0,
    }
  );
  editor.getEditorState().read(() => {
    expect($getRoot().getFirstChild()?.getTextContent()).toBe("Inserted");
    expect($getRoot().getLastChild()?.getKey()).toBe(lastKey);
  });
});

test("uses the surviving boundary when a block before a root drop is removed", () => {
  const { editor, rootKey } = documentWithParagraphs();
  let firstKey = "";
  let lastKey = "";
  editor.getEditorState().read(() => {
    firstKey = $getRoot().getFirstChild()?.getKey() ?? "";
    lastKey = $getRoot().getLastChild()?.getKey() ?? "";
  });
  editor.update(() => $getRoot().getFirstChild()?.remove(), {
    discrete: true,
  });
  placeContentBlock(
    editor,
    null,
    () => $createParagraphNode().append($createTextNode("Inserted")),
    {
      key: rootKey,
      offset: 1,
      type: "element",
      beforeKey: lastKey,
      afterKey: firstKey,
      fallbackIndex: 1,
    }
  );
  editor.getEditorState().read(() => {
    expect($getRoot().getFirstChild()?.getTextContent()).toBe("Inserted");
    expect($getRoot().getLastChild()?.getKey()).toBe(lastKey);
  });
});
