"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  FOCUS_COMMAND,
} from "lexical";
import { useEffect, useRef } from "react";

const TAB_TO_FOCUS_INTERVAL = 200;

export function TabFocusPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const lastTabKeyDownTimestampRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        lastTabKeyDownTimestampRef.current = event.timeStamp;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    const unregisterCommand = editor.registerCommand(
      FOCUS_COMMAND,
      (event: FocusEvent) => {
        const selection = $getSelection();
        if (
          $isRangeSelection(selection) &&
          lastTabKeyDownTimestampRef.current + TAB_TO_FOCUS_INTERVAL >
            event.timeStamp
        ) {
          $setSelection(selection.clone());
        }
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      unregisterCommand();
    };
  }, [editor]);

  return null;
}
