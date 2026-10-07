"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  PERPLEXITY_SEARCH_HEADER_MS,
  PERPLEXITY_SEARCH_QUERY_MS,
  PERPLEXITY_SEARCH_SETTLE_MS,
  PERPLEXITY_SEARCH_SOURCES_MS,
  PERPLEXITY_THINKING_GAP_MS,
  PERPLEXITY_THINKING_MS,
} from "../constants/perplexity";
import type { PerplexityThreadMessage } from "../types/perplexity";

const TOKEN_SPLIT = /(\s+)/;
const USER_TURN_MS = 420;
const TOKEN_MS = 28;
const TURN_SETTLE_MS = 480;
const REDUCED_MOTION_MAX_MS = 70;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const searchDuration = (queryCount: number) =>
  PERPLEXITY_SEARCH_HEADER_MS +
  queryCount * PERPLEXITY_SEARCH_QUERY_MS +
  PERPLEXITY_SEARCH_SOURCES_MS;

export const usePerplexityPlayback = (
  script: readonly PerplexityThreadMessage[],
  reducedMotion: boolean
) => {
  const [messages, setMessages] = useState<PerplexityThreadMessage[]>(() => [
    ...script,
  ]);
  const [completeIds, setCompleteIds] = useState<ReadonlySet<string>>(
    () => new Set(script.map((item) => item.id))
  );
  const [thinking, setThinking] = useState(false);
  const [playing, setPlaying] = useState(false);
  const runRef = useRef(0);
  const sendingRef = useRef(false);

  const markComplete = useCallback((id: string) => {
    setCompleteIds((current) => new Set(current).add(id));
  }, []);

  const stop = useCallback(() => {
    runRef.current += 1;
    sendingRef.current = false;
    setMessages([...script]);
    setCompleteIds(new Set(script.map((item) => item.id)));
    setThinking(false);
    setPlaying(false);
  }, [script]);

  const streamText = useCallback(
    async (
      message: PerplexityThreadMessage,
      alive: () => boolean,
      delay: (ms: number) => Promise<void>
    ) => {
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
        await delay(TOKEN_MS);
      }
      markComplete(message.id);
      await delay(TURN_SETTLE_MS);
    },
    [markComplete]
  );

  const playTurn = useCallback(
    async (message: PerplexityThreadMessage, alive: () => boolean) => {
      const delay = (ms: number) =>
        wait(reducedMotion ? Math.min(ms, REDUCED_MOTION_MAX_MS) : ms);

      if (message.from === "user") {
        setMessages((current) => [...current, message]);
        markComplete(message.id);
        await delay(USER_TURN_MS);
        return;
      }

      setThinking(true);
      await delay(PERPLEXITY_THINKING_MS);
      if (!alive()) {
        return;
      }
      setThinking(false);
      await delay(PERPLEXITY_THINKING_GAP_MS);
      if (!alive()) {
        return;
      }

      if (reducedMotion) {
        setMessages((current) => [...current, message]);
        markComplete(message.id);
        await delay(PERPLEXITY_SEARCH_SETTLE_MS);
        return;
      }

      setMessages((current) => [...current, { ...message, text: "" }]);
      if (message.search) {
        await delay(
          searchDuration(message.search.queries.length) +
            PERPLEXITY_SEARCH_SETTLE_MS
        );
        if (!alive()) {
          return;
        }
      }

      await streamText(message, alive, delay);
    },
    [markComplete, reducedMotion, streamText]
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

      setPlaying(true);
      try {
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
      } finally {
        sendingRef.current = false;
      }
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
  };
};
