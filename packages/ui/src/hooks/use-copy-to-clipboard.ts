"use client";

import type {
  UseCopyToClipboardOptions,
  UseCopyToClipboardResult,
} from "@notra/ui/types/copy-button";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_COPIED_TIMEOUT_MS = 2000;

/**
 * Copies text and keeps `copied` true for `timeout` ms afterwards, so a button
 * can confirm the copy in place. Repeated copies restart the timer.
 */
export function useCopyToClipboard({
  timeout = DEFAULT_COPIED_TIMEOUT_MS,
  onError,
}: UseCopyToClipboardOptions = {}): UseCopyToClipboardResult {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    []
  );

  const copy = useCallback(
    async (text: string) => {
      // A failed attempt must not keep showing the previous success.
      const clear = () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setCopiedText(null);
      };
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        clear();
        onErrorRef.current?.("unsupported");
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        clear();
        onErrorRef.current?.("failed", error);
        return false;
      }

      setCopiedText(text);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setCopiedText(null);
        timerRef.current = null;
      }, timeout);
      return true;
    },
    [timeout]
  );

  return { copied: copiedText !== null, copiedText, copy };
}
