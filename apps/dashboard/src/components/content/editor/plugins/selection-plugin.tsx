"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { useEffect } from "react";

export type TextSelection = {
  text: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
};

interface SelectionPluginProps {
  onSelectionChange: (selection: TextSelection | null) => void;
}

function getLineAndCharFromOffset(text: string, offset: number): { line: number; char: number } {
  const lines = text.substring(0, offset).split("\n");
  return {
    line: lines.length,
    char: (lines[lines.length - 1]?.length ?? 0) + 1,
  };
}

export function SelectionPlugin({ onSelectionChange }: SelectionPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregister = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection) && !selection.isCollapsed()) {
            const text = selection.getTextContent().trim();
            if (!text) {
              return;
            }

            // Get the full text content to calculate positions
            const root = $getRoot();
            const fullText = root.getTextContent();

            // Get anchor and focus points
            const anchor = selection.anchor;
            const focus = selection.focus;

            // Calculate offsets by traversing the tree
            let anchorOffset = 0;
            let focusOffset = 0;

            const nodes = root.getAllTextNodes();
            for (const node of nodes) {
              const nodeText = node.getTextContent();
              if (node.getKey() === anchor.key) {
                anchorOffset += anchor.offset;
              } else if (anchorOffset === 0 || node.getKey() < anchor.key) {
                anchorOffset += nodeText.length;
              }

              if (node.getKey() === focus.key) {
                focusOffset += focus.offset;
              } else if (focusOffset === 0 || node.getKey() < focus.key) {
                focusOffset += nodeText.length;
              }
            }

            // Ensure start is before end
            const startOffset = Math.min(anchorOffset, focusOffset);
            const endOffset = Math.max(anchorOffset, focusOffset);

            const start = getLineAndCharFromOffset(fullText, startOffset);
            const end = getLineAndCharFromOffset(fullText, endOffset);

            onSelectionChange({
              text,
              startLine: start.line,
              startChar: start.char,
              endLine: end.line,
              endChar: end.char,
            });
          }
        });
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    return () => {
      unregister();
    };
  }, [editor, onSelectionChange]);

  return null;
}
