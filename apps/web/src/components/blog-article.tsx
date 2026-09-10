"use client";

import { useEffect, useRef } from "react";
import type { BlogArticleProps } from "~types/blog";

import { ARTICLE_CLASS_NAME } from "@/constants/content";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

const COPY_BUTTON_SELECTOR = "[data-copy-code]";
const COPIED_STATE_DURATION_MS = 2000;

export function BlogArticle({ children }: BlogArticleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const copiedTimers = useRef(
    new Map<Element, ReturnType<typeof setTimeout>>()
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const timers = copiedTimers.current;

    function markCopied(button: Element) {
      button.setAttribute("data-copied", "true");

      const existingTimer = timers.get(button);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      timers.set(
        button,
        setTimeout(() => {
          button.removeAttribute("data-copied");
          timers.delete(button);
        }, COPIED_STATE_DURATION_MS)
      );
    }

    async function handleCopyClick(event: MouseEvent) {
      const { target } = event;

      if (!(target instanceof Element)) {
        return;
      }

      const button = target.closest(COPY_BUTTON_SELECTOR);

      if (!button) {
        return;
      }

      const code =
        button.parentElement?.querySelector("code")?.textContent ?? "";

      const copied = await copyToClipboard(code, "Copied to clipboard");

      if (copied) {
        markCopied(button);
      }
    }

    container.addEventListener("click", handleCopyClick);

    return () => {
      container.removeEventListener("click", handleCopyClick);
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  return (
    <div ref={containerRef}>
      <div className={ARTICLE_CLASS_NAME}>{children}</div>
    </div>
  );
}
