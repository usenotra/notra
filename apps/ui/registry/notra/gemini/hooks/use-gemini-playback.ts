"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  GEMINI_SEARCHING_LABEL,
  GEMINI_THINKING_LABEL,
} from "../constants/gemini";
import type { GeminiStoryMessage } from "../types/gemini";

const TOKEN_SPLIT = /(\s+)/;
const REDUCED_MOTION_MAX_DELAY_MS = 70;
const USER_TURN_DELAY_MS = 420;
const SEARCH_DELAY_MS = 1800;
const THINK_DELAY_MS = 1100;
const REDUCED_REPLY_DELAY_MS = 180;
const TOKEN_DELAY_MS = 28;
const TURN_END_DELAY_MS = 480;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const useGeminiPlayback = (
  script: readonly GeminiStoryMessage[],
  reducedMotion: boolean
) => {
  const [messages, setMessages] = useState<GeminiStoryMessage[]>(() => [
    ...script,
  ]);
  const [completeIds, setCompleteIds] = useState<ReadonlySet<string>>(
    () => new Set(script.map((item) => item.id))
  );
  const [thinking, setThinking] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState(GEMINI_SEARCHING_LABEL);
  const [playing, setPlaying] = useState(false);
  const runRef = useRef(0);
  const sendingRef = useRef(false);

  const markComplete = useCallback((id: string) => {
    setCompleteIds((current) => new Set(current).add(id));
  }, []);

  const resetToScript = useCallback(() => {
    setMessages([...script]);
    setCompleteIds(new Set(script.map((item) => item.id)));
    setThinking(false);
    setThinkingLabel(GEMINI_SEARCHING_LABEL);
    setPlaying(false);
  }, [script]);

  const stop = useCallback(() => {
    runRef.current += 1;
    sendingRef.current = false;
    resetToScript();
  }, [resetToScript]);

  const playTurn = useCallback(
    async (message: GeminiStoryMessage, alive: () => boolean) => {
      const delay = (ms: number) =>
        wait(reducedMotion ? Math.min(ms, REDUCED_MOTION_MAX_DELAY_MS) : ms);

      if (message.from === "user") {
        setMessages((current) => [...current, message]);
        markComplete(message.id);
        await delay(USER_TURN_DELAY_MS);
        return;
      }

      setThinkingLabel(
        message.search ? GEMINI_SEARCHING_LABEL : GEMINI_THINKING_LABEL
      );
      setThinking(true);
      await delay(message.search ? SEARCH_DELAY_MS : THINK_DELAY_MS);
      if (!alive()) {
        return;
      }
      setThinking(false);

      if (reducedMotion) {
        setMessages((current) => [...current, message]);
        markComplete(message.id);
        await delay(REDUCED_REPLY_DELAY_MS);
        return;
      }

      setMessages((current) => [...current, { ...message, text: "" }]);
      let text = "";
      for (const token of message.text.split(TOKEN_SPLIT)) {
        if (!alive()) {
          return;
        }
        text += token;
        const snapshot = text;
        setMessages((current) =>
          current.map((item) =>
            item.id === message.id ? { ...item, text: snapshot } : item
          )
        );
        await delay(TOKEN_DELAY_MS);
      }
      markComplete(message.id);
      await delay(TURN_END_DELAY_MS);
    },
    [markComplete, reducedMotion]
  );

  const play = useCallback(async () => {
    const run = runRef.current + 1;
    runRef.current = run;
    const alive = () => runRef.current === run;

    setPlaying(true);
    setThinking(false);
    setMessages([]);
    setCompleteIds(new Set());

    for (const message of script) {
      if (!alive()) {
        return;
      }
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- turns must play one after another
      await playTurn(message, alive);
    }

    if (alive()) {
      setPlaying(false);
    }
  }, [playTurn, script]);

  const send = useCallback(
    async (text: string, reply: string) => {
      if (sendingRef.current) {
        return;
      }
      sendingRef.current = true;
      const run = runRef.current + 1;
      runRef.current = run;
      const alive = () => runRef.current === run;
      const now = Date.now();

      const playExchange = async () => {
        setPlaying(true);
        await playTurn({ from: "user", id: `user-${now}`, text }, alive);
        if (!alive()) {
          return;
        }
        await playTurn(
          { from: "assistant", id: `assistant-${now}`, text: reply },
          alive
        );
        if (alive()) {
          setPlaying(false);
        }
      };

      await playExchange().finally(() => {
        sendingRef.current = false;
      });
    },
    [playTurn]
  );

  useEffect(
    () => () => {
      runRef.current += 1;
    },
    []
  );

  return {
    completeIds,
    messages,
    play,
    playing,
    send,
    stop,
    thinking,
    thinkingLabel,
  };
};
