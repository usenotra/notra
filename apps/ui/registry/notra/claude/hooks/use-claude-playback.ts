"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { claudeSearchDuration, claudeWait } from "../lib/claude-search";
import type { ClaudeDemoMessage } from "../types/claude";

const TOKEN_SPLIT = /(\s+)/;

const USER_TURN_MS = 420;
const THINKING_MS = 1200;
const SETTLE_MS = 180;
const TOKEN_MS = 28;
const TURN_GAP_MS = 480;
const REDUCED_MAX_MS = 70;

const idsOf = (script: readonly ClaudeDemoMessage[]) =>
  new Set(script.map((item) => item.id));

export const useClaudePlayback = (
  script: readonly ClaudeDemoMessage[],
  reducedMotion: boolean
) => {
  const [messages, setMessages] = useState<ClaudeDemoMessage[]>(() => [
    ...script,
  ]);
  const [completeIds, setCompleteIds] = useState(() => idsOf(script));
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
    setCompleteIds(idsOf(script));
    setThinking(false);
    setPlaying(false);
  }, [script]);

  const playTurn = useCallback(
    async (message: ClaudeDemoMessage, alive: () => boolean) => {
      const delay = (ms: number) =>
        claudeWait(reducedMotion ? Math.min(ms, REDUCED_MAX_MS) : ms);

      if (message.from === "user") {
        setMessages((current) => [...current, message]);
        markComplete(message.id);
        await delay(USER_TURN_MS);
        return;
      }

      if (reducedMotion) {
        if (!message.search) {
          setThinking(true);
          await delay(THINKING_MS);
          if (!alive()) {
            return;
          }
          setThinking(false);
        }
        setMessages((current) => [...current, message]);
        markComplete(message.id);
        await delay(SETTLE_MS);
        return;
      }

      if (message.search) {
        setThinking(false);
        setMessages((current) => [...current, { ...message, text: "" }]);
        await delay(
          claudeSearchDuration(message.search, reducedMotion) + SETTLE_MS
        );
      } else {
        setThinking(true);
        await delay(THINKING_MS);
        if (!alive()) {
          return;
        }
        setThinking(false);
        setMessages((current) => [...current, { ...message, text: "" }]);
      }

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
      await delay(TURN_GAP_MS);
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

  return { completeIds, messages, play, playing, send, stop, thinking };
};
