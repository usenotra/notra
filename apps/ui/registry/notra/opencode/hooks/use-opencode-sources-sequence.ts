"use client";

import { useEffect, useState } from "react";

import {
  OPENCODE_SEARCH_HEADER_MS,
  OPENCODE_SEARCH_QUERY_MS,
  OPENCODE_SEARCH_SOURCES_MS,
} from "../constants/opencode";

interface OpencodeSourcesSequence {
  queries: number;
  sources: boolean;
}

/** Reveals the query lines one by one, then the cited sources. */
export const useOpencodeSourcesSequence = (
  enabled: boolean,
  queryCount: number,
  sourceCount: number
): OpencodeSourcesSequence => {
  const [sequence, setSequence] = useState<OpencodeSourcesSequence>({
    queries: 0,
    sources: false,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timers: number[] = [];
    let elapsed = OPENCODE_SEARCH_HEADER_MS;

    for (let index = 0; index < queryCount; index += 1) {
      timers.push(
        window.setTimeout(() => {
          setSequence((current) => ({ ...current, queries: index + 1 }));
        }, elapsed)
      );
      elapsed += OPENCODE_SEARCH_QUERY_MS;
    }
    if (sourceCount > 0) {
      timers.push(
        window.setTimeout(() => {
          setSequence((current) => ({ ...current, sources: true }));
        }, elapsed + OPENCODE_SEARCH_SOURCES_MS)
      );
    }

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [enabled, queryCount, sourceCount]);

  return sequence;
};
