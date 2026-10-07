"use client";

import { type RefObject, useEffect } from "react";

import { CHAT_ANNOTATION_HIGHLIGHT_NAME } from "@/constants/chat-annotations";
import { findPassageRanges } from "@/utils/find-passage-range";

const PASSAGE_SEPARATOR = "\u0000";

/**
 * Marks annotated passages inside `root` with the CSS Custom Highlight API,
 * so the rendered markdown is never touched. Passages that no longer appear
 * (the agent rewrote them) simply stop being marked.
 */
export function useAnnotationHighlights(
  rootRef: RefObject<HTMLElement | null>,
  passages: readonly string[],
  contentKey: string
) {
  // A string key keeps the effect from re-running on every new array.
  const passagesKey = passages.join(PASSAGE_SEPARATOR);

  useEffect(() => {
    const root = rootRef.current;
    const list = passagesKey ? passagesKey.split(PASSAGE_SEPARATOR) : [];
    if (!(root && "highlights" in CSS) || list.length === 0) {
      return;
    }
    const ranges = findPassageRanges(root, list);
    const highlight = new Highlight(...ranges);
    CSS.highlights.set(CHAT_ANNOTATION_HIGHLIGHT_NAME, highlight);
    return () => {
      if (CSS.highlights.get(CHAT_ANNOTATION_HIGHLIGHT_NAME) === highlight) {
        CSS.highlights.delete(CHAT_ANNOTATION_HIGHLIGHT_NAME);
      }
    };
    // contentKey re-runs the search when the post body changes.
  }, [rootRef, passagesKey, contentKey]);
}
