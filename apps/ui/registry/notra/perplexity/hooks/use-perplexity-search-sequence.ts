"use client";

import { useEffect, useState } from "react";

import {
  PERPLEXITY_SEARCH_HEADER_MS,
  PERPLEXITY_SEARCH_QUERY_MS,
  PERPLEXITY_SEARCH_SETTLE_MS,
  PERPLEXITY_SEARCH_SOURCES_MS,
  PERPLEXITY_SEARCH_STAGGER_MS,
} from "../constants/perplexity";

interface PerplexitySearchSequence {
  done: boolean;
  queries: number;
  sources: boolean;
}

interface PerplexitySearchSequenceOptions {
  enabled: boolean;
  onDone: () => void;
  onStart: () => void;
  previewCount: number;
  queryCount: number;
}

/**
 * Plays the search step in: queries one by one, then the sources, then done.
 * `onStart` and `onDone` let the step open while it plays and close after.
 */
export const usePerplexitySearchSequence = ({
  enabled,
  onDone,
  onStart,
  previewCount,
  queryCount,
}: PerplexitySearchSequenceOptions): PerplexitySearchSequence => {
  const [sequence, setSequence] = useState<PerplexitySearchSequence>({
    done: false,
    queries: 0,
    sources: false,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    onStart();
    const timers: number[] = [];
    let elapsed = PERPLEXITY_SEARCH_HEADER_MS;

    for (let index = 0; index < queryCount; index += 1) {
      timers.push(
        window.setTimeout(() => {
          setSequence((current) => ({ ...current, queries: index + 1 }));
        }, elapsed)
      );
      elapsed += PERPLEXITY_SEARCH_QUERY_MS;
    }

    timers.push(
      window.setTimeout(() => {
        setSequence((current) => ({ ...current, sources: true }));
      }, elapsed)
    );
    elapsed += Math.max(
      PERPLEXITY_SEARCH_SOURCES_MS,
      previewCount * PERPLEXITY_SEARCH_STAGGER_MS + PERPLEXITY_SEARCH_SETTLE_MS
    );
    timers.push(
      window.setTimeout(() => {
        setSequence((current) => ({ ...current, done: true }));
        onDone();
      }, elapsed)
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [enabled, onDone, onStart, previewCount, queryCount]);

  return sequence;
};
