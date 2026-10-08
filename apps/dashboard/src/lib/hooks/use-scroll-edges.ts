"use client";

import { type RefObject, useEffect, useState } from "react";

// Within a pixel counts as the edge, so sub-pixel layouts don't flicker.
const EDGE_TOLERANCE_PX = 1;

/** Whether a scroll container has more content above and below its viewport. */
export function useScrollEdges(ref: RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState({
    canScrollUp: false,
    canScrollDown: false,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const update = () => {
      const canScrollUp = element.scrollTop > EDGE_TOLERANCE_PX;
      const canScrollDown =
        element.scrollTop + element.clientHeight <
        element.scrollHeight - EDGE_TOLERANCE_PX;
      setEdges((current) =>
        current.canScrollUp === canScrollUp &&
        current.canScrollDown === canScrollDown
          ? current
          : { canScrollUp, canScrollDown }
      );
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of Array.from(element.children)) {
      observer.observe(child);
    }
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [ref]);

  return edges;
}
