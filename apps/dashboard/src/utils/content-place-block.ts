import { $insertNodeToNearestRoot } from "@lexical/utils";
import {
  $createParagraphNode,
  $createRangeSelection,
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  $isTextNode,
  $setSelection,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";

import type { ContentDropPoint } from "@/types/content/media";

// Restore a file drop's captured caret after upload, including positions before blocks and within text.
export function placeContentBlock(
  editor: LexicalEditor,
  afterKey: string | null,
  create: () => LexicalNode,
  dropPoint?: ContentDropPoint
) {
  let insertedKey = afterKey;
  editor.update(
    () => {
      const block = create();
      const point = dropPoint;
      const pointNode = point ? $getNodeByKey(point.key) : null;
      if (
        point &&
        pointNode &&
        ((point.type === "text" && $isTextNode(pointNode)) ||
          (point.type === "element" && $isElementNode(pointNode)))
      ) {
        const selection = $createRangeSelection();
        const offset = $isElementNode(pointNode)
          ? Math.min(point.offset, pointNode.getChildrenSize())
          : Math.min(point.offset, pointNode.getTextContentSize());
        selection.anchor.set(point.key, offset, point.type);
        selection.focus.set(point.key, offset, point.type);
        $setSelection(selection);
        $insertNodeToNearestRoot(block);
      } else {
        const anchor = insertedKey ? $getNodeByKey(insertedKey) : null;
        const top = anchor?.getTopLevelElement() ?? anchor;
        if (top?.getParent()) {
          top.insertAfter(block);
        } else {
          $getRoot().append(block);
        }
      }
      const paragraph = $createParagraphNode();
      block.insertAfter(paragraph);
      paragraph.select();
      insertedKey = paragraph.getKey();
    },
    { discrete: true }
  );
  return insertedKey;
}
