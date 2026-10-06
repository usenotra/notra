"use client";

import { useEffect, useState } from "react";

/** How far below the viewport top a heading must pass to count as current. */
const ACTIVE_LINE_PX = 120;

/**
 * Returns the id of the last section whose top has scrolled past the active
 * line, so the table of contents follows the reader.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      let current: string | null = null;
      for (const id of ids) {
        const element = document.getElementById(id);
        if (!element) {
          continue;
        }
        if (element.getBoundingClientRect().top <= ACTIVE_LINE_PX) {
          current = id;
        }
      }
      setActiveId(current);
    };

    const schedule = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(update);
      }
    };

    update();
    // Capture so scrolls inside the inset panel count too.
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [ids]);

  return activeId;
}
