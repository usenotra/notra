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

function pauseMs(ms: number, reducedMotion: boolean): number {
  return reducedMotion ? GEO_REPLAY_REDUCED_MOTION_PAUSE_MS : ms;
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

    let index = 0;
    let typed = "";
    let tokens: string[] = [];
    let tokenAt = 0;
    let timeoutId = 0;

    function later(ms: number, next: () => void) {
      timeoutId = window.setTimeout(next, ms);
    }

    function showUser() {
      typed = "";
      setProgress({ index, stage: "user", typed: "" });
      later(pauseMs(GEO_REPLAY_USER_PAUSE_MS, reducedMotion), startTyping);
    }

    function startTyping() {
      const answer = turns[index]?.answer ?? "";
      if (reducedMotion) {
        setProgress({ index, stage: "typing", typed: answer });
        later(pauseMs(GEO_REPLAY_TURN_PAUSE_MS, reducedMotion), advance);
        return;
      }
      tokens = answer.split(WHITESPACE_SPLIT);
      tokenAt = 0;
      typed = "";
      typeNext();
    }

    function typeNext() {
      const token = tokens[tokenAt];
      if (token === undefined) {
        later(pauseMs(GEO_REPLAY_TURN_PAUSE_MS, reducedMotion), advance);
        return;
      }
      typed += token;
      tokenAt += 1;
      setProgress({ index, stage: "typing", typed });
      later(typeInterval(tokens.length), typeNext);
    }

    function advance() {
      index += 1;
      if (index >= turns.length) {
        setProgress(null);
        return;
      }
      showUser();
    }

    showUser();
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [playToken, reducedMotion, skipReplay, turns]);

  return skipReplay ? null : progress;
}
