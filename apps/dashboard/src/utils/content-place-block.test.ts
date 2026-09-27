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
