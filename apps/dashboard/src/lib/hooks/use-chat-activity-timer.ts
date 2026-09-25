"use client";

import { useEffect, useRef, useState } from "react";

export function useChatActivityTimer(
  isRunning: boolean,
  chatId: string,
  responseId: string | undefined
): number | undefined {
  const startedAt = useRef<number | null>(null);
  const measuredChatId = useRef<string | undefined>(undefined);
  const measuredResponseId = useRef<string | undefined>(undefined);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (isRunning) {
      measuredResponseId.current = responseId;
    }
  }, [isRunning, responseId]);

  useEffect(() => {
    if (!isRunning) {
      if (startedAt.current !== null) {
        setSeconds(
          Math.max(1, Math.ceil((Date.now() - startedAt.current) / 1000))
        );
      }
      startedAt.current = null;
      return;
    }

    startedAt.current = Date.now();
    measuredChatId.current = chatId;
    setSeconds(0);
    const interval = window.setInterval(() => {
      setSeconds(
        Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000)
      );
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, chatId]);

  if (isRunning) {
    return startedAt.current === null || measuredChatId.current !== chatId
      ? 0
      : seconds;
  }
  return measuredChatId.current === chatId &&
    measuredResponseId.current === responseId &&
    responseId !== undefined
    ? seconds
    : undefined;
}
