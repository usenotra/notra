"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Selection {
  text: string;
}

function getTextareaSelection(target: HTMLTextAreaElement): string | null {
  const start = target.selectionStart;
  const end = target.selectionEnd;
  if (start === end) {
    return null;
  }
  const text = target.value.substring(start, end).trim();
  return text || null;
}

function getDomSelection(container: HTMLElement): string | null {
  const activeSelection = window.getSelection();
  if (!activeSelection || activeSelection.isCollapsed) {
    return null;
  }

  const range = activeSelection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) {
    return null;
  }

  const text = activeSelection.toString().trim();
  return text || null;
}

export function useTextSelection(
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const lastValidSelection = useRef<Selection | null>(null);

  useEffect(() => {
    const handleMouseUp = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const target = event.target as HTMLElement;
      if (!container.contains(target)) {
        return;
      }

      let text: string | null = null;

      if (target instanceof HTMLTextAreaElement) {
        text = getTextareaSelection(target);
      } else {
        text = getDomSelection(container);
      }

      if (text) {
        const newSelection = { text };
        lastValidSelection.current = newSelection;
        setSelection(newSelection);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [containerRef]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    lastValidSelection.current = null;
    window.getSelection()?.removeAllRanges();
  }, []);

  return { selection, clearSelection };
}
