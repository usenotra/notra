"use client";

import { claudeChatSearchDuration } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-search-timing";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ClaudeChatStoryMessage } from "@/types/design-system-claude-chat";

const TOKEN_SPLIT = /(\s+)/;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function useClaudeChatPlayback(
  script: readonly ClaudeChatStoryMessage[],
  reducedMotion: boolean
) {
  const [messages, setMessages] = useState<ClaudeChatStoryMessage[]>(() => [
    ...script,
  ]);
  const [completeIds, setCompleteIds] = useState(
    () => new Set(script.map((item) => item.id))
  );
  const [thinking, setThinking] = useState(false);
  const [playing, setPlaying] = useState(false);
  const runRef = useRef(0);
  const sendingRef = useRef(false);

  const resetToScript = useCallback(() => {
    setMessages([...script]);
    setCompleteIds(new Set(script.map((item) => item.id)));
    setThinking(false);
    setPlaying(false);
  }, [script]);

  const stop = useCallback(() => {
    runRef.current += 1;
    sendingRef.current = false;
    resetToScript();
  }, [resetToScript]);

  const playTurn = useCallback(
    async (
      message: ClaudeChatStoryMessage,
      alive: () => boolean
    ): Promise<void> => {
      const delay = (ms: number) => wait(reducedMotion ? Math.min(ms, 70) : ms);

      if (message.from === "user") {
        setMessages((current) => [...current, message]);
        setCompleteIds((current) => new Set(current).add(message.id));
        await delay(420);
        return;
      }

      if (message.search) {
        setThinking(false);
        setMessages((current) => [
          ...current,
          reducedMotion ? message : { ...message, text: "" },
        ]);
        if (reducedMotion) {
          setCompleteIds((current) => new Set(current).add(message.id));
          await delay(180);
          return;
        }
        await delay(
          claudeChatSearchDuration(
            message.search.groups.length,
            message.search.steps?.length ?? 0,
            reducedMotion
          ) + 180
        );
        if (!alive()) {
          return;
        }
      } else {
        setThinking(true);
        await delay(1200);
        if (!alive()) {
          return;
        }
        setThinking(false);

        if (reducedMotion) {
          setMessages((current) => [...current, message]);
          setCompleteIds((current) => new Set(current).add(message.id));
          await delay(180);
          return;
        }

        setMessages((current) => [...current, { ...message, text: "" }]);
      }

      const tokens = message.text.split(TOKEN_SPLIT);
      let text = "";
      for (const token of tokens) {
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
        await delay(28);
      }
      setCompleteIds((current) => new Set(current).add(message.id));
      await delay(480);
    },
    [reducedMotion]
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
      // react-doctor-disable-next-line react-doctor/async-await-in-loop
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
      const userMessage: ClaudeChatStoryMessage = {
        id: `user-${now}`,
        from: "user",
        text,
      };
      const assistantMessage: ClaudeChatStoryMessage = {
        id: `assistant-${now}`,
        from: "assistant",
        text: reply,
      };

      const playExchange = async () => {
        setPlaying(true);
        await playTurn(userMessage, alive);
        if (!alive()) {
          return;
        }
        await playTurn(assistantMessage, alive);
        if (alive()) {
          setPlaying(false);
        }
      };

      // `.finally` instead of try/finally: React Compiler bails out of the
      // whole hook on try/finally syntax.
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
    messages,
    completeIds,
    thinking,
    playing,
    play,
    stop,
    send,
  };
}
