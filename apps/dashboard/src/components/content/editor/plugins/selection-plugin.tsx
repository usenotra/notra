"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isTableCellNode, $isTableSelection } from "@lexical/table";
import type { TextSelection } from "@notra/schemas/dashboard/content";
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
  type LexicalNode,
} from "lexical";
import { useEffect, useRef } from "react";

interface SelectionPluginProps {
  onSelectionChange: (selection: TextSelection | null) => void;
  selectedExcerpt: TextSelection | null;
}

function getLineAndCharFromOffset(
  text: string,
  offset: number
): { line: number; char: number } {
  const lines = text.substring(0, offset).split("\n");
  return {
    line: lines.length,
    char: (lines.at(-1)?.length ?? 0) + 1,
  };
}

function $getExcerptSelection() {
  const selection = $getSelection();
  if ($isTableSelection(selection)) {
    return selection;
  }
  if ($isRangeSelection(selection) && !selection.isCollapsed()) {
    return selection;
  }
  return null;
}

function $documentOffset(key: string, innerOffset: number): number {
  let offset = 0;
  let found = false;
  const visit = (node: LexicalNode) => {
    if (found) {
      return;
    }
    if (node.getKey() === key) {
      offset += innerOffset;
      found = true;
      return;
    }
    if (!$isElementNode(node)) {
      offset += node.getTextContentSize();
      return;
    }
    const children = node.getChildren();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child) {
        continue;
      }
      visit(child);
      if (found) {
        return;
      }
      // ponytail: Lexical ElementNode.getTextContent inserts \n\n between blocks
      if (
        $isElementNode(child) &&
        i !== children.length - 1 &&
        !child.isInline()
      ) {
        offset += 2;
      }
    }
  };
  visit($getRoot());
  return offset;
}

function $getExcerptOffsets(
  selection: NonNullable<ReturnType<typeof $getExcerptSelection>>
) {
  if ($isTableSelection(selection)) {
    const cells = selection.getNodes().filter($isTableCellNode);
    const first = cells[0];
    const last = cells.at(-1);
    if (!(first && last)) {
      return { startOffset: 0, endOffset: 0 };
    }
    const startOffset = $documentOffset(first.getKey(), 0);
    const endOffset = $documentOffset(last.getKey(), last.getTextContentSize());
    return {
      startOffset: Math.min(startOffset, endOffset),
      endOffset: Math.max(startOffset, endOffset),
    };
  }
  const anchorOffset = $documentOffset(
    selection.anchor.key,
    selection.anchor.offset
  );
  const focusOffset = $documentOffset(
    selection.focus.key,
    selection.focus.offset
  );
  return {
    startOffset: Math.min(anchorOffset, focusOffset),
    endOffset: Math.max(anchorOffset, focusOffset),
  };
}

function $readEditorTextSelection(): TextSelection | null {
  const selection = $getExcerptSelection();
  if (!selection) {
    return null;
  }
  const text = selection.getTextContent().trim();
  if (!text) {
    return null;
  }
  const { startOffset, endOffset } = $getExcerptOffsets(selection);
  const fullText = $getRoot().getTextContent();
  const start = getLineAndCharFromOffset(fullText, startOffset);
  const end = getLineAndCharFromOffset(fullText, endOffset);
  return {
    text,
    startLine: start.line,
    startChar: start.char,
    endLine: end.line,
    endChar: end.char,
  };
}

export function SelectionPlugin({
  onSelectionChange,
  selectedExcerpt,
}: SelectionPluginProps) {
  const [editor] = useLexicalComposerContext();
  const selectedExcerptRef = useRef(selectedExcerpt);

  useEffect(() => {
    const shouldCollapseEditorSelection =
      selectedExcerpt === null && selectedExcerptRef.current !== null;
    selectedExcerptRef.current = selectedExcerpt;
    if (!shouldCollapseEditorSelection) {
      return;
    }
    editor.update(() => {
      if ($getExcerptSelection()) {
        $setSelection(null);
      }
    });
  }, [editor, selectedExcerpt]);

  useEffect(() => {
    const unregister = editor.registerUpdateListener(
      ({ editorState, prevEditorState }) => {
        const previousSelection = prevEditorState.read(() => $getSelection());
        editorState.read(() => {
          const selection = $getSelection();
          // Keep the excerpt when focus moves to the chat composer.
          if (
            selection === null ||
            (selectedExcerptRef.current !== null &&
              selection.is(previousSelection))
          ) {
            return;
          }
          const nextSelection = $readEditorTextSelection();
          if (!nextSelection) {
            selectedExcerptRef.current = null;
            onSelectionChange(null);
            return;
          }
          selectedExcerptRef.current = nextSelection;
          onSelectionChange(nextSelection);
        });
      }
    );

    return () => {
      unregister();
    };
  }, [editor, onSelectionChange]);

  return null;
}
