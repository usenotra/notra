"use client";

import { useRef } from "react";

/**
 * Returns the previous value while `key` is unchanged, so a value rebuilt on
 * every render (e.g. per streamed chunk) keeps its identity for memo deps.
 */
export function useStableValue<T>(value: T, key: string): T {
  const ref = useRef<{ key: string; value: T } | null>(null);
  if (ref.current?.key !== key) {
    ref.current = { key, value };
  }
  return ref.current.value;
}
