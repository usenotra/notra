"use client";

import { getHighlighterOptions, preloadHighlighter } from "@pierre/diffs";
import { useEffect, useState } from "react";

import { SKILL_DIFF_LANGUAGE, SKILL_DIFF_THEMES } from "@/constants/skills";

let preloadPromise: Promise<void> | null = null;
let highlighterReady = false;

function preloadSkillDiffHighlighter(): Promise<void> {
  preloadPromise ??= preloadHighlighter(
    getHighlighterOptions(SKILL_DIFF_LANGUAGE, { theme: SKILL_DIFF_THEMES })
  ).finally(() => {
    highlighterReady = true;
  });
  return preloadPromise;
}

/**
 * `@pierre/diffs` renders synchronously once shiki is loaded, but its async
 * first-load path can drop the paint when the diff mounts inside a dialog
 * that re-renders while opening, leaving the diff empty until it is reopened.
 * Gating the diff on a preloaded highlighter keeps every render on the
 * synchronous path. A failed preload still resolves to `true` so the diff
 * falls back to the library's own loading.
 */
export function useSkillDiffHighlighterReady(): boolean {
  const [ready, setReady] = useState(highlighterReady);

  useEffect(() => {
    if (ready) {
      return;
    }
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) {
        setReady(true);
      }
    };
    preloadSkillDiffHighlighter()
      .catch(() => undefined)
      .finally(markReady);
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return ready;
}
