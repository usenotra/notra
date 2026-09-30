"use client";

import { useCallback, useRef, useState } from "react";

type TurnRef = (element: HTMLElement | null) => () => void;

export const useChatMinimapScrollSpy = () => {
  const [visible, setVisible] = useState<ReadonlySet<number>>(new Set());
  const elements = useRef(new Map<number, HTMLElement>());
  const indexes = useRef(new WeakMap<Element, number>());
  const turnRefs = useRef(new Map<number, TurnRef>());
  const observer = useRef<IntersectionObserver | null>(null);
  const rootElement = useRef<HTMLElement | null>(null);

  const rootRef = useCallback((root: HTMLElement | null) => {
    if (!root) {
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        setVisible((previous) => {
          const next = new Set(previous);
          for (const entry of entries) {
            const index = indexes.current.get(entry.target);
            if (index === undefined) {
              continue;
            }
            if (entry.isIntersecting) {
              next.add(index);
            } else {
              next.delete(index);
            }
          }
          return next;
        });
      },
      { root }
    );
    observer.current = io;
    rootElement.current = root;
    for (const element of elements.current.values()) {
      io.observe(element);
    }
    return () => {
      io.disconnect();
      observer.current = null;
      rootElement.current = null;
    };
  }, []);

  const turnRef = useCallback((index: number) => {
    const cached = turnRefs.current.get(index);
    if (cached) {
      return cached;
    }
    const ref: TurnRef = (element) => {
      if (element) {
        elements.current.set(index, element);
        indexes.current.set(element, index);
        observer.current?.observe(element);
      }
      return () => {
        if (element) {
          observer.current?.unobserve(element);
        }
        elements.current.delete(index);
        setVisible((previous) => {
          const next = new Set(previous);
          next.delete(index);
          return next;
        });
      };
    };
    turnRefs.current.set(index, ref);
    return ref;
  }, []);

  const scrollToTurn = useCallback((index: number) => {
    const root = rootElement.current;
    const element = elements.current.get(index);
    if (!(root && element)) {
      return;
    }
    root.scrollBy({
      behavior: "smooth",
      top:
        element.getBoundingClientRect().top - root.getBoundingClientRect().top,
    });
  }, []);

  return { rootRef, scrollToTurn, turnRef, visible };
};
