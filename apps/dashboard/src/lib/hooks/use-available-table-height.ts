"use client";

import { TABLE_FRAME_INSET_PX } from "@notra/ui/constants/table";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Height to pass as a table's `height` so the whole table, frame included,
 * fills the measured element.
 */
export function useAvailableTableHeight(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(fallback);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const update = () => {
      const next = Math.floor(element.clientHeight) - TABLE_FRAME_INSET_PX;
      if (next > 0) {
        setHeight((current) => (current === next ? current : next));
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, height] as const;
}
