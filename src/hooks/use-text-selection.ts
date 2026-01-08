"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TextSelection {
  text: string;
}

export function useTextSelection(
  containerRef: React.RefObject<HTMLElement | null>
) {
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const lastValidSelection = useRef<TextSelection | null>(null);

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (target instanceof HTMLTextAreaElement) {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        if (start !== end) {
          const text = target.value.substring(start, end).trim();
          if (text) {
            const newSelection = { text };
            lastValidSelection.current = newSelection;
            setSelection(newSelection);
          }
        }
        return;
      }

      const activeSelection = window.getSelection();
      if (!activeSelection || activeSelection.isCollapsed) {
        return;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const range = activeSelection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        return;
      }

      const text = activeSelection.toString().trim();
      if (!text) {
        return;
      }

      const newSelection = { text };
      lastValidSelection.current = newSelection;
      setSelection(newSelection);
    },
    [containerRef]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.addEventListener("mouseup", handleMouseUp);
    return () => {
      container.removeEventListener("mouseup", handleMouseUp);
    };
  }, [containerRef, handleMouseUp]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    lastValidSelection.current = null;
    window.getSelection()?.removeAllRanges();
  }, []);

  return { selection, clearSelection };
}
