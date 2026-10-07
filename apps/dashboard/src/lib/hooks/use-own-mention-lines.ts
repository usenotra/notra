"use client";

import { type RefObject, useLayoutEffect } from "react";

const OWN_MENTION_BLOCKS = "[data-own-mention]:not(td, th)";
const LINE_TINT =
  "linear-gradient(to right, color-mix(in oklab, var(--geo-up) 10%, transparent), transparent 75%)";

function tintMentionLines(block: HTMLElement) {
  const blockTop = block.getBoundingClientRect().top;
  const lineHeight =
    Number.parseFloat(getComputedStyle(block).lineHeight) || 24;
  const lineTops = new Set<number>();
  // An own-brand mention is the only <mark> inside a block; competitor
  // mentions render as buttons. Each client rect is one wrapped line.
  for (const mark of block.querySelectorAll("mark")) {
    for (const rect of mark.getClientRects()) {
      const center = rect.top - blockTop + rect.height / 2;
      lineTops.add(Math.round(center - lineHeight / 2));
    }
  }

  const tops = [...lineTops];
  block.style.backgroundImage = tops.map(() => LINE_TINT).join(", ");
  block.style.backgroundPosition = tops.map((top) => `0 ${top}px`).join(", ");
  block.style.backgroundSize = `100% ${lineHeight}px`;
  block.style.backgroundRepeat = "no-repeat";
}

function clearTint(block: HTMLElement) {
  block.style.removeProperty("background-image");
  block.style.removeProperty("background-position");
  block.style.removeProperty("background-size");
  block.style.removeProperty("background-repeat");
}

/**
 * Tints only the wrapped lines of an answer that name the user's own brand.
 * Line breaks depend on layout, so the tint is measured and re-applied when
 * the answer renders or changes width.
 */
export function useOwnMentionLines(container: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = container.current;
    if (!root) {
      return;
    }
    let tinted = new Set<HTMLElement>();
    let frame = 0;

    const apply = () => {
      frame = 0;
      const blocks = new Set(
        root.querySelectorAll<HTMLElement>(OWN_MENTION_BLOCKS)
      );
      for (const block of tinted) {
        if (!blocks.has(block)) {
          clearTint(block);
        }
      }
      for (const block of blocks) {
        tintMentionLines(block);
      }
      tinted = blocks;
    };
    const schedule = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(apply);
      }
    };

    apply();
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    const mutation = new MutationObserver(schedule);
    mutation.observe(root, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      for (const block of tinted) {
        clearTint(block);
      }
    };
  }, [container]);
}
