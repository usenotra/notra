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

const HIDDEN: OpencodeSourcesSequence = { queries: 0, sources: false };

/** Reveals the search lines one at a time, then the cited sources. */
export const useOpencodeSourcesSequence = (
  enabled: boolean,
  queryCount: number,
  sourceCount: number
): OpencodeSourcesSequence => {
  const [sequence, setSequence] = useState(HIDDEN);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const timers: number[] = [];
    const schedule = (at: number, next: Partial<OpencodeSourcesSequence>) => {
      timers.push(
        window.setTimeout(() => {
          setSequence((current) => ({ ...current, ...next }));
        }, at)
      );
    };

    let at = OPENCODE_SEARCH_HEADER_MS;
    for (let shown = 1; shown <= queryCount; shown += 1) {
      schedule(at, { queries: shown });
      at += OPENCODE_SEARCH_QUERY_MS;
    }
    if (sourceCount > 0) {
      schedule(at + OPENCODE_SEARCH_SOURCES_MS, { sources: true });
    }

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
      setSequence(HIDDEN);
    };
  }, [enabled, queryCount, sourceCount]);

  return sequence;
};
