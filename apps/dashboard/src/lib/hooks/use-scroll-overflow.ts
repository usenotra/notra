"use client";

import { useEffect, useRef, useState } from "react";

import type { ScrollOverflow } from "@/types/scroll-overflow";

export function useScrollOverflow<T extends HTMLElement>(
  itemCount: number
): ScrollOverflow<T> {
  const ref = useRef<T>(null);
  const [atEnd, setAtEnd] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const measure = () => {
      setAtEnd(node.scrollTop + node.clientHeight + 1 >= node.scrollHeight);
    };
    measure();
    node.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [itemCount]);

  return { ref, atEnd };
}
