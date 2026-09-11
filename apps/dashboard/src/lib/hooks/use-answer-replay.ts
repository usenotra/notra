"use client";

import { useEffect, useState } from "react";

import {
  GEO_REPLAY_MAX_TYPE_TOTAL_MS,
  GEO_REPLAY_MIN_TYPE_INTERVAL_MS,
  GEO_REPLAY_REDUCED_MOTION_PAUSE_MS,
  GEO_REPLAY_TURN_PAUSE_MS,
  GEO_REPLAY_TYPE_INTERVAL_MS,
  GEO_REPLAY_USER_PAUSE_MS,
} from "@/constants/geo-replay";
import type { AnswerReplayProgress, AnswerReplayTurn } from "@/types/geo";

const WHITESPACE_SPLIT = /(\s+)/;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function typeInterval(tokenCount: number): number {
  if (tokenCount === 0) {
    return GEO_REPLAY_TYPE_INTERVAL_MS;
  }
  return Math.max(
    GEO_REPLAY_MIN_TYPE_INTERVAL_MS,
    Math.min(
      GEO_REPLAY_TYPE_INTERVAL_MS,
      Math.round(GEO_REPLAY_MAX_TYPE_TOTAL_MS / tokenCount)
    )
  );
}

export function useAnswerReplay(
  turns: readonly AnswerReplayTurn[],
  playToken: number,
  reducedMotion: boolean,
  skipReplay = false
) {
  const [progress, setProgress] = useState<AnswerReplayProgress | null>(() =>
    playToken === 0 || turns.length === 0 || skipReplay
      ? null
      : { index: 0, stage: "user", typed: "" }
  );

  useEffect(() => {
    if (playToken === 0 || turns.length === 0 || skipReplay) {
      return;
    }
    let cancelled = false;
    const pause = (ms: number) =>
      wait(reducedMotion ? GEO_REPLAY_REDUCED_MOTION_PAUSE_MS : ms);

    async function play() {
      for (let index = 0; index < turns.length; index += 1) {
        if (cancelled) {
          return;
        }
        setProgress({ index, stage: "user", typed: "" });
        await pause(GEO_REPLAY_USER_PAUSE_MS);
        if (cancelled) {
          return;
        }
        const answer = turns[index]?.answer ?? "";
        if (reducedMotion) {
          setProgress({ index, stage: "typing", typed: answer });
        } else {
          const tokens = answer.split(WHITESPACE_SPLIT);
          const interval = typeInterval(tokens.length);
          let typed = "";
          for (const token of tokens) {
            typed += token;
            if (cancelled) {
              return;
            }
            setProgress({ index, stage: "typing", typed });
            await wait(interval);
          }
        }
        await pause(GEO_REPLAY_TURN_PAUSE_MS);
      }
      if (!cancelled) {
        setProgress(null);
      }
    }

    play();
    return () => {
      cancelled = true;
    };
  }, [playToken, reducedMotion, skipReplay, turns]);

  return skipReplay ? null : progress;
}
