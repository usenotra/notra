"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { useEffect } from "react";

interface SelectionPluginProps {
  onSelectionChange: (selectedText: string | null) => void;
}

export function SelectionPlugin({ onSelectionChange }: SelectionPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregister = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && !selection.isCollapsed()) {
          const text = selection.getTextContent().trim();
          onSelectionChange(text || null);
        }
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    // Also listen to native selection changes as backup
    const handleNativeSelection = () => {
      const nativeSelection = window.getSelection();
      if (nativeSelection && !nativeSelection.isCollapsed) {
        const text = nativeSelection.toString().trim();
        if (text) {
          onSelectionChange(text);
        }
      }
    };

    document.addEventListener("selectionchange", handleNativeSelection);

    return () => {
      unregister();
      document.removeEventListener("selectionchange", handleNativeSelection);
    };
  }, [editor, onSelectionChange]);

  return null;
}
