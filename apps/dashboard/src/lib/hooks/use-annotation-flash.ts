"use client";

import { type RefObject, useEffect, useEffectEvent, useState } from "react";

import { CHAT_ANNOTATION_FLASH_MS } from "@/constants/chat-annotations";
import type {
  ChatAnnotationFlashRect,
  ChatAnnotationFocus,
} from "@/types/chat-annotations";
import {
  findPassageRanges,
  getTextLineRects,
} from "@/utils/find-passage-range";

// The post body may still be loading or the panel still opening.
const FIND_ATTEMPTS = 12;
const FIND_RETRY_MS = 100;

/**
 * Scrolls a focused passage into the middle of the preview and returns its
 * line boxes, relative to `articleRef`, for a short flash overlay.
 */
export function useAnnotationFlash(
  articleRef: RefObject<HTMLElement | null>,
  scrollRef: RefObject<HTMLElement | null>,
  focus: ChatAnnotationFocus | null,
  onMissing: () => void,
  onHandled: () => void
) {
  const [rects, setRects] = useState<ChatAnnotationFlashRect[]>([]);
  const nonce = focus?.nonce;
  const passage = focus?.text;

  const reportMissing = useEffectEvent(onMissing);
  const markHandled = useEffectEvent(onHandled);

  useEffect(() => {
    if (!(nonce && passage)) {
      return;
    }
    let attempts = 0;
    let lastWidth = -1;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const run = () => {
      const article = articleRef.current;
      const scroller = scrollRef.current;
      const [range] = article ? findPassageRanges(article, [passage]) : [];
      // Measure only once the panel has stopped growing, or the boxes land
      // where the text was before it reflowed.
      const width = scroller?.clientWidth ?? -1;
      const settling = width !== lastWidth;
      lastWidth = width;
      if (!(article && scroller && range) || settling) {
        attempts += 1;
        if (attempts < FIND_ATTEMPTS) {
          timer = setTimeout(run, FIND_RETRY_MS);
        } else {
          if (!range) {
            reportMissing();
          }
          markHandled();
        }
        return;
      }
      const box = range.getBoundingClientRect();
      const view = scroller.getBoundingClientRect();
      scroller.scrollTo({
        top:
          scroller.scrollTop +
          (box.top - view.top) -
          (view.height - box.height) / 2,
        behavior: reduceMotion ? "auto" : "smooth",
      });
      const origin = article.getBoundingClientRect();
      setRects(
        getTextLineRects(range).map((rect, index) => ({
          key: `${nonce}-${index}`,
          top: rect.top - origin.top,
          left: rect.left - origin.left,
          width: rect.width,
          height: rect.height,
        }))
      );
      timer = setTimeout(() => {
        setRects([]);
        // Cleared once shown, so remounting this tab later does not flash
        // the same passage again.
        markHandled();
      }, CHAT_ANNOTATION_FLASH_MS);
    };

    run();
    return () => clearTimeout(timer);
  }, [articleRef, scrollRef, nonce, passage]);

  return rects;
}
